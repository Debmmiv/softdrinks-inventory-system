# Fix Pack: What Changed

## Bugs fixed
1. **Stock overwrite on sync** (`syncEngine.ts`, `calculations.ts`, `transactionRepo.ts`)
   Pulling the catalog used to replace local stock with the server total, erasing the phone's own
   unsynced transactions. Local stock is now `server total + pending local deltas`.
2. **Endless retries** (`transactionRepo.ts`, `syncEngine.ts`, `sync.tsx`)
   Items rejected `MAX_SYNC_RETRIES` (5) times are parked. A "Retry Stopped Items" button on the
   Sync screen gives them a fresh start. Network errors, timeouts, 5xx and 401 no longer use up
   retries.
3. **Stuck SYNCING rows**: if the app was killed mid-upload, rows stayed SYNCING forever. They are
   reset to PENDING at the start of every sync.
4. **Queue larger than 100**: the engine now keeps sending batches until the queue is empty.
5. **Last product deactivated** was never hidden on phones (empty catalog skipped cleanup). Fixed.
6. **Mock-product cleanup** no longer fails on products that have local transactions.

## Security / hardening
- Login throttling (429 after repeated failures), equal timing for unknown user vs wrong password,
  and account-deactivated status only revealed after a correct password (`rateLimit.ts`, `login+api.ts`).
- Internal error text is no longer sent to clients (`response.ts`). Set `EXPOSE_ERROR_DETAILS=true`
  only while debugging.
- Batch sync no longer leaks raw database errors; temporary server errors are returned in a new
  `deferred` list and retried without using up retries.
- Product duplicate check escapes user text before building a RegExp.

## New features
- **Product Management screen** (owner): list, add, edit, deactivate/reactivate.
- **Reports screen** (owner): replenishment alerts + movement summary by period and type.

## Cleanup
- Removed the `mock-prod-*` shim from the sync API and the fake-product seeding on app start.
  **Sync every phone BEFORE deploying this if any still hold unsynced transactions for mock products.**
- Removed the hardcoded `D:\` path from `AI-CONTEXT.md`.

## Tests
`cd mobile && npm test` runs 27 unit tests (validation, stock math, login throttle).

## Not changed (by design)
- `/api/sync/downstream` still returns the whole active catalog. The phone's cleanup logic relies
  on seeing the full list, so adding `since` filtering would need a client change as well.
- The login throttle is in server memory. Fine for one server; use a shared store if you run several.
