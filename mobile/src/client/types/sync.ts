// All possible states a queued transaction can be in
// PENDING  → recorded locally, not yet sent to server
// SYNCING  → currently being transmitted (prevents double-send)
// SYNCED   → server confirmed receipt, MongoDB updated
// FAILED   → server rejected or network died mid-send
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

// One row in the local sync_queue table
export interface QueueItem {
  queue_id: number;
  transaction_uuid: string;
  status: SyncStatus;
  retry_count: number;
  error_message: string | null;
  queued_at: string;         // ISO 8601 UTC
  synced_at: string | null;  // Set when status becomes SYNCED
}

// The batch payload sent to POST /api/sync/batch (Phase 2/3)
export interface BatchSyncPayload {
  transactions: import('./transaction').Transaction[];
}

// What the server responds with
export interface BatchSyncResponse {
  synced: string[];  // UUIDs successfully committed to MongoDB
  failed: { uuid: string; reason: string }[];
}
