import { getDatabase } from './db';
import { updateLocalStock } from './productRepo';
import type { Transaction, NewTransactionInput } from '../types/transaction';
import type { QueueItem } from '../types/sync';
import { nowISO } from '../utils/date';
import { TABLES } from '../utils/constants';
import { toTotalBottles } from '../utils/calculations';
import * as Crypto from 'expo-crypto';

/**
 * The core write operation of the entire offline-first system. (FR11-FR14, FR17, NFR2)
 *
 * Wrapped in a single SQLite transaction (BEGIN...COMMIT):
 *   1. INSERT the transaction record (append-only ledger)
 *   2. UPDATE local_stock_bottles on the product
 *   3. INSERT into sync_queue as PENDING
 *
 * If ANY step throws, everything rolls back — zero partial writes.
 */
export async function recordTransaction(
  input: NewTransactionInput,
  currentStockBottles: number,
  productUnitsPerCase: number,
  userId: string,
  deviceId: string
): Promise<Transaction> {
  const db = await getDatabase();

  const uuid = Crypto.randomUUID();
  const created_at = nowISO();
  const delta = toTotalBottles(input.cases, input.loose_bottles, productUnitsPerCase);

  // For RELEASE and negative ADJUSTMENT, delta becomes negative
  const signed_delta =
    input.transaction_type === 'DELIVERY'
      ? delta
      : input.transaction_type === 'RELEASE'
        ? -delta
        : input.cases >= 0 && input.loose_bottles >= 0
          ? // ADJUSTMENT: positive input = stock gain, negative = loss (UI sends signed values)
            delta
          : -delta;

  const resulting_stock = currentStockBottles + signed_delta;

  const tx: Transaction = {
    uuid,
    product_id: input.product_id,
    user_id: userId,
    device_id: deviceId,
    transaction_type: input.transaction_type,
    cases: Math.abs(input.cases),
    loose_bottles: Math.abs(input.loose_bottles),
    total_bottles_delta: signed_delta,
    resulting_stock_bottles: resulting_stock,
    reason: input.reason ?? null,
    remarks: input.remarks ?? null,
    reference_tag: input.reference_tag ?? null,
    created_at,
  };

  // All three writes are atomic — either all succeed or none do (NFR2)
  await db.withTransactionAsync(async () => {
    // 1. Immutable transaction log entry
    await db.runAsync(
      `INSERT INTO ${TABLES.TRANSACTIONS}
         (uuid, product_id, user_id, device_id, transaction_type,
          cases, loose_bottles, total_bottles_delta, resulting_stock_bottles,
          reason, remarks, reference_tag, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.uuid, tx.product_id, tx.user_id, tx.device_id, tx.transaction_type,
        tx.cases, tx.loose_bottles, tx.total_bottles_delta, tx.resulting_stock_bottles,
        tx.reason, tx.remarks, tx.reference_tag, tx.created_at,
      ]
    );

    // 2. Update running stock total on the product row
    await updateLocalStock(db, input.product_id, resulting_stock);

    // 3. Queue for eventual sync to MongoDB Atlas
    await db.runAsync(
      `INSERT INTO ${TABLES.SYNC_QUEUE}
         (transaction_uuid, status, retry_count, queued_at)
       VALUES (?, 'PENDING', 0, ?)`,
      [uuid, created_at]
    );
  });

  return tx;
}

/** Full history log newest-first. Used by TransactionHistoryScreen (FR24). */
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDatabase();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM ${TABLES.TRANSACTIONS} ORDER BY created_at DESC`
  );
}

/** Filtered history for a single product. */
export async function getTransactionsByProduct(productId: string): Promise<Transaction[]> {
  const db = await getDatabase();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM ${TABLES.TRANSACTIONS}
     WHERE product_id = ?
     ORDER BY created_at DESC`,
    [productId]
  );
}

/** Returns PENDING and FAILED items for the sync engine and SyncQueueScreen. */
export async function getPendingQueue(): Promise<QueueItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<QueueItem>(
    `SELECT * FROM ${TABLES.SYNC_QUEUE}
     WHERE status IN ('PENDING', 'FAILED')
     ORDER BY queued_at ASC` // FIFO — first recorded is first sent (FR18)
  );
}

/** Returns all queue items for the full Sync Queue screen display. */
export async function getAllQueueItems(): Promise<QueueItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<QueueItem>(
    `SELECT * FROM ${TABLES.SYNC_QUEUE} ORDER BY queued_at DESC`
  );
}

/** How many transactions are waiting to be synced. Used by SyncBadge. */
export async function getPendingCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM ${TABLES.SYNC_QUEUE} WHERE status IN ('PENDING','FAILED')`
  );
  return row?.c ?? 0;
}

/** Mark a successfully synced transaction (FR22). */
export async function markSynced(uuid: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ${TABLES.SYNC_QUEUE}
     SET status = 'SYNCED', synced_at = ?, error_message = NULL
     WHERE transaction_uuid = ?`,
    [nowISO(), uuid]
  );
}

/** Mark a failed sync attempt with the error reason (FR22). */
export async function markFailed(uuid: string, error: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ${TABLES.SYNC_QUEUE}
     SET status = 'FAILED',
         retry_count = retry_count + 1,
         error_message = ?
     WHERE transaction_uuid = ?`,
    [error, uuid]
  );
}

/** Mark item as currently being transmitted (prevents duplicate sends). */
export async function markSyncing(uuid: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ${TABLES.SYNC_QUEUE} SET status = 'SYNCING' WHERE transaction_uuid = ?`,
    [uuid]
  );
}

/**
 * Permanently dismisses all FAILED queue items by marking them as 'SYNCED'.
 * Used when a transaction cannot ever be synced (e.g., references a mock product
 * that no longer exists in the canonical catalog). The transaction record itself
 * is preserved in the immutable ledger; only the queue entry is dismissed.
 */
export async function dismissFailedItems(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ${TABLES.SYNC_QUEUE}
     SET status = 'SYNCED', synced_at = ?, error_message = 'Dismissed by user'
     WHERE status = 'FAILED'`,
    [nowISO()]
  );
}

/** Fetches multiple transactions by their UUIDs for batch sync payload. */
export async function getTransactionsByUuids(uuids: string[]): Promise<Transaction[]> {
  if (uuids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = uuids.map(() => '?').join(',');
  return db.getAllAsync<Transaction>(
    `SELECT * FROM ${TABLES.TRANSACTIONS} WHERE uuid IN (${placeholders})`,
    uuids
  );
}
