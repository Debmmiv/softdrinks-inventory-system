import * as SecureStore from 'expo-secure-store';
import {
  getPendingQueue,
  getTransactionsByUuids,
  markSyncing,
  markSynced,
  markFailed,
  releaseToPending,
  resetStuckSyncing,
  getPendingDeltaForProduct,
} from '../database/transactionRepo';
import { upsertProduct } from '../database/productRepo';
import { uploadBatchApi, fetchDownstreamApi } from '../api/syncApi';
import { networkService } from './networkService';
import { reconcileLocalStock } from '../utils/calculations';

const STORAGE_LAST_SYNC_KEY = 'last_downstream_sync_timestamp';

/** Items per upload request (NFR6). */
const BATCH_SIZE = 100;
/** Safety valve: at most this many upload requests in one sync cycle. */
const MAX_BATCH_ROUNDS = 20;

export const SESSION_INVALID_MESSAGE =
  'Your session has expired or was revoked. Log in again while online to resume syncing. Your records are safe on this device.';

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
   * Pushes all PENDING / retryable FAILED local transactions to MongoDB Atlas, in FIFO batches,
   * until the queue is empty. (FR18, FR20, FR21, NFR3)
   *
   * Retry rules:
   *  - Server REJECTED the record (validation failure)  -> FAILED, retry counter +1.
   *  - Network down / timeout / 5xx / 429                -> back to PENDING, counter untouched,
   *    so a flaky connection can never use up a transaction's retries.
   *  - 401 (expired or revoked session)                  -> back to PENDING, counter untouched.
   */
  async syncUpstream(): Promise<{ syncedCount: number; failedCount: number; error?: string }> {
    // Crash recovery: rows left SYNCING by an app kill would otherwise never be sent again.
    await resetStuckSyncing();

    let syncedCount = 0;
    let failedCount = 0;
    // Items already tried in this cycle (so a server-rejected item is not resent immediately).
    const attempted = new Set<string>();

    for (let round = 0; round < MAX_BATCH_ROUNDS; round++) {
      const queue = (await getPendingQueue()).filter((i) => !attempted.has(i.transaction_uuid));
      if (queue.length === 0) break;

      const uuids = queue.slice(0, BATCH_SIZE).map((item) => item.transaction_uuid);
      uuids.forEach((u) => attempted.add(u));

      // Mark as SYNCING to prevent parallel duplicate calls
      await Promise.all(uuids.map((u) => markSyncing(u)));

      try {
        const transactions = await getTransactionsByUuids(uuids);
        const response = await uploadBatchApi({ transactions });

        await Promise.all(response.synced.map((uuid) => markSynced(uuid)));
        await Promise.all(
          response.failed.map((f) => markFailed(f.uuid, f.reason || 'Server rejected transaction.'))
        );

        // Anything the server neither confirmed nor rejected (e.g. a temporary server error on
        // that one record) goes back to PENDING without costing a retry.
        const handled = new Set([...response.synced, ...response.failed.map((f) => f.uuid)]);
        const leftover = uuids.filter((u) => !handled.has(u));
        if (leftover.length > 0) {
          await releaseToPending(leftover, 'Server could not process this record yet. Will retry.');
        }

        syncedCount += response.synced.length;
        failedCount += response.failed.length;
      } catch (err) {
        const httpStatus = (err as { response?: { status?: number } })?.response?.status;

        if (httpStatus === 401) {
          await releaseToPending(uuids, SESSION_INVALID_MESSAGE);
          return { syncedCount, failedCount, error: SESSION_INVALID_MESSAGE };
        }

        const errorMsg =
          err instanceof Error ? err.message : 'Network error occurred during batch sync.';

        const transient =
          httpStatus === undefined || httpStatus >= 500 || httpStatus === 408 || httpStatus === 429;

        if (transient) {
          await releaseToPending(uuids, errorMsg);
          return { syncedCount, failedCount, error: errorMsg };
        }

        // Other 4xx: the request itself was refused. Count it as a failed attempt.
        await Promise.all(uuids.map((u) => markFailed(u, errorMsg)));
        return { syncedCount, failedCount: failedCount + uuids.length, error: errorMsg };
      }
    }

    return { syncedCount, failedCount };
  }

  /**
   * Pulls the authoritative catalog and stock levels from MongoDB Atlas. (FR23, FR31)
   *
   * Stock shown on the phone = server total + this phone's not-yet-confirmed transactions, so
   * pulling the catalog never erases the staff's own unsynced work.
   */
  async syncDownstream(onProductUpdated?: () => Promise<void>): Promise<number> {
    try {
      const lastSync = await SecureStore.getItemAsync(STORAGE_LAST_SYNC_KEY);
      const response = await fetchDownstreamApi(lastSync);

      if (Array.isArray(response.products)) {
        // Clean out legacy mock products & prune stale products that are no longer in Atlas.
        // Rows referenced by local transactions are kept (foreign key), only hidden.
        try {
          const { getDatabase } = await import('../database/db');
          const db = await getDatabase();
          await db.runAsync(
            `DELETE FROM products
             WHERE id LIKE 'mock-prod-%'
               AND id NOT IN (SELECT DISTINCT product_id FROM transactions)`
          );

          const activeIds = response.products.map((p) => p._id);
          if (activeIds.length === 0) {
            await db.runAsync(`UPDATE products SET is_active = 0`);
          } else {
            const placeholders = activeIds.map(() => '?').join(',');
            await db.runAsync(
              `UPDATE products SET is_active = 0 WHERE id NOT IN (${placeholders})`,
              activeIds
            );
          }
          await db.runAsync(
            `DELETE FROM products WHERE is_active = 0 AND id NOT IN (SELECT DISTINCT product_id FROM transactions)`
          );
        } catch (cleanErr) {
          console.warn('[SyncEngine] Catalog reconciliation notice:', cleanErr);
        }

        for (const p of response.products) {
          // Read the pending delta right before writing to keep the race window tiny.
          const pendingDelta = await getPendingDeltaForProduct(p._id);
          await upsertProduct({
            id: p._id,
            brand_name: p.brand_name,
            product_name: p.product_name,
            bottle_size: p.bottle_size,
            units_per_case: p.units_per_case,
            reorder_threshold_bottles: p.reorder_threshold_bottles,
            local_stock_bottles: reconcileLocalStock(p.total_stock_bottles, pendingDelta),
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
        success: upstream.failedCount === 0 && !upstream.error,
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
