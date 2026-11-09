import * as SecureStore from 'expo-secure-store';
import {
  getPendingQueue,
  getTransactionsByUuids,
  markSyncing,
  markSynced,
  markFailed,
  getPendingCount,
} from '../database/transactionRepo';
import { upsertProduct } from '../database/productRepo';
import { uploadBatchApi, fetchDownstreamApi } from '../api/syncApi';
import { networkService } from './networkService';

const STORAGE_LAST_SYNC_KEY = 'last_downstream_sync_timestamp';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errorMessage?: string;
}

class SyncEngine {
  private isSyncing = false;
  private syncListeners: Set<(isSyncing: boolean) => void> = new Set();

  /**
   * Pushes all PENDING / FAILED local transactions to MongoDB Atlas. (FR18, FR20, FR21, NFR3)
   */
  async syncUpstream(): Promise<{ syncedCount: number; failedCount: number; error?: string }> {
    const queue = await getPendingQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }

    // Limit to batch size of 100 items (NFR6)
    const batchItems = queue.slice(0, 100);
    const uuids = batchItems.map((item) => item.transaction_uuid);

    // Mark as SYNCING to prevent parallel duplicate calls
    await Promise.all(uuids.map((u) => markSyncing(u)));

    try {
      const transactions = await getTransactionsByUuids(uuids);

      const response = await uploadBatchApi({ transactions });

      // Mark successful transactions as SYNCED
      await Promise.all(response.synced.map((uuid) => markSynced(uuid)));

      // Mark rejected transactions as FAILED
      await Promise.all(
        response.failed.map((f) => markFailed(f.uuid, f.reason || 'Server rejected transaction.'))
      );

      return {
        syncedCount: response.synced.length,
        failedCount: response.failed.length,
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Network error occurred during batch sync.';

      // On request failure, return items to FAILED status so they can be retried
      await Promise.all(uuids.map((u) => markFailed(u, errorMsg)));

      return {
        syncedCount: 0,
        failedCount: uuids.length,
        error: errorMsg,
      };
    }
  }

  /**
   * Pulls newly added/updated products and authoritative stock levels from MongoDB Atlas. (FR23, FR31)
   */
  async syncDownstream(onProductUpdated?: () => Promise<void>): Promise<number> {
    try {
      const lastSync = await SecureStore.getItemAsync(STORAGE_LAST_SYNC_KEY);
      const response = await fetchDownstreamApi(lastSync);

      if (response.products && response.products.length > 0) {
        // Clean out legacy mock products & prune stale duplicate products not in Atlas
        try {
          const { getDatabase } = await import('../database/db');
          const db = await getDatabase();
          await db.runAsync(`DELETE FROM products WHERE id LIKE 'mock-prod-%'`);

          // Deactivate or delete local products no longer present in cloud catalog
          const activeIds = response.products.map((p) => p._id);
          const placeholders = activeIds.map(() => '?').join(',');
          await db.runAsync(
            `UPDATE products SET is_active = 0 WHERE id NOT IN (${placeholders})`,
            activeIds
          );
          await db.runAsync(
            `DELETE FROM products WHERE is_active = 0 AND id NOT IN (SELECT DISTINCT product_id FROM transactions)`
          );
        } catch (cleanErr) {
          console.warn('[SyncEngine] Catalog reconciliation notice:', cleanErr);
        }

        for (const p of response.products) {
          await upsertProduct({
            id: p._id,
            brand_name: p.brand_name,
            product_name: p.product_name,
            bottle_size: p.bottle_size,
            units_per_case: p.units_per_case,
            reorder_threshold_bottles: p.reorder_threshold_bottles,
            local_stock_bottles: p.total_stock_bottles,
            is_active: p.is_active,
            updated_at: p.updated_at,
          });
        }

        if (onProductUpdated) {
          await onProductUpdated();
        }
      }

      if (response.server_time) {
        await SecureStore.setItemAsync(STORAGE_LAST_SYNC_KEY, response.server_time);
      }

      return response.products?.length || 0;
    } catch (err) {
      console.warn('[SyncEngine] Downstream sync warning:', err);
      return 0;
    }
  }

  /**
   * Full bidirectional synchronization cycle: Upstream Push -> Downstream Pull.
   */
  async syncAll(onProductUpdated?: () => Promise<void>): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, failedCount: 0, errorMessage: 'Sync already in progress.' };
    }

    const isOnline = await networkService.checkOnlineAsync();
    if (!isOnline) {
      return { success: false, syncedCount: 0, failedCount: 0, errorMessage: 'Device is offline.' };
    }

    this.setSyncing(true);

    try {
      // 1. Push local offline transactions to cloud
      const upstream = await this.syncUpstream();

      // 2. Pull latest cloud catalog and stock to phone
      await this.syncDownstream(onProductUpdated);

      return {
        success: upstream.failedCount === 0,
        syncedCount: upstream.syncedCount,
        failedCount: upstream.failedCount,
        errorMessage: upstream.error,
      };
    } finally {
      this.setSyncing(false);
    }
  }

  private setSyncing(status: boolean) {
    this.isSyncing = status;
    for (const listener of this.syncListeners) {
      listener(status);
    }
  }

  subscribeSyncing(listener: (isSyncing: boolean) => void): () => void {
    this.syncListeners.add(listener);
    listener(this.isSyncing);
    return () => this.syncListeners.delete(listener);
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncEngine = new SyncEngine();
