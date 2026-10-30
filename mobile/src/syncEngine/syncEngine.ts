// TODO (Member 3): implement the sync.
//
// runSync() steps:
//   1. Read sync_queue rows where status is PENDING or FAILED (retry_count below a limit),
//      joined with their transactions rows.
//   2. Send them with pushTransactions() from ../api/syncApi.
//   3. For each result: SYNCED or DUPLICATE -> set status SYNCED.
//      FAILED -> set status FAILED, store last_error, increase retry_count.
//   4. Refresh the product catalog and stock from the server, then add the
//      remaining PENDING transactions on top so unsynced work is not lost.
//   5. Call runSync() when NetInfo reports the device is online again.
export async function runSync(): Promise<void> {
  // not implemented yet
}
