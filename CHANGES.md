# Fix Pack: What Changed

# Hardening changes: sync integrity, session security, discrepancy review

## 1. Sync integrity (`mobile/src/app/api/sync/batch+api.ts`)
- Stock update and ledger insert now commit together in one MongoDB transaction. A retried or
  concurrent duplicate `uuid` is rejected by the unique index, its stock change rolls back, and the
  record is reported as synced. Stock changes once. (Requires a replica set; every Atlas cluster is one.)
- Each record is validated against the product's pack size: `|delta| = cases x units_per_case + loose`,
  sign must match the type, a breakage/damage/loss adjustment cannot add stock. Failures are returned
  in `failed[]` with a readable reason.
- `CONCURRENCY_DEFICIT` is raised only when a movement that removes stock leaves central stock below zero.
  Records now store `discrepancy_status`, `discrepancy_note`, `stock_after_sync`, `synced_by`, `synced_at`.
- `user_id` from the device is honoured only if it is a real account (shared-phone queues); otherwise the
  uploading session's id is used. `synced_by` always records who uploaded.
- Batches above 200 records are refused.

## 2. Session security (`server/middleware/auth.ts` and auth routes)
- `authenticate()` is now async and checks MongoDB on every request: account exists, is active,
  `token_version` matches. Role comes from the database, not the token.
- `token_version` (new `User` field, default 0) is bumped on password reset, password change and
  deactivation, which invalidates every older token. Password change returns a fresh token for the device.
- Default token life 30d -> 7d, configurable with `JWT_EXPIRES_IN`.
- Tokens issued before this change have no `tv` claim and count as version 0, so nobody is logged out by
  the upgrade itself.
- Missing `JWT_SECRET` now returns 500 instead of masquerading as an invalid token.

## 3. Discrepancy review
- `GET /api/discrepancies?status=open|resolved|all` and `PATCH /api/discrepancies/:id` (owner only,
  resolution note required; the ledger row itself is never edited).
- Owner screen `(owner)/discrepancies.tsx`, menu entry, and a dashboard banner showing the open count.
- A 401 during sync keeps transactions PENDING (no retry burned) and tells the user to log in again.

## 4. Bug fix found during verification
`recordTransaction` negated signed adjustment quantities a second time, so **breakage / damage / loss
adjustments were recorded as stock gains**. Fixed in `client/database/transactionRepo.ts`; the server now
also rejects the contradiction. To find records already affected in Atlas:

```js
db.transactions.find({
  transaction_type: 'ADJUSTMENT',
  reason: { $in: ['breakage', 'damage', 'loss'] },
  total_bottles_delta: { $gt: 0 }
})
```
Correct each product's stock with a Count Correction after a physical count.

## 5. Password Security & Policy Enforcement
- **Comprehensive Depot Password Policy (`client/utils/passwordPolicy.ts` & `server/services/passwordPolicy.ts`)**:
  - Enforces minimum 8 characters, maximum 128 characters.
  - Requires at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol (`@$!%*?&#^()_-+=~`).
  - Disallows passwords containing the user's username.
  - Blocks common weak/predictable passwords (e.g., `password123`, `admin12345`, `qwerty123`).
- **Clean Visual Password Strength Meter (`client/components/PasswordStrengthMeter.tsx`)**:
  - Real-time strength calculation (Weak / Fair / Strong / Very Strong) with clean colored bar segments.
  - Stripped checklist labels per depot requirements; relies on clean placeholder hints.
- **Server-Side Validation & Token Invalidation (`api/auth/...`)**:
  - Validates passwords server-side on self-serve change, admin enrollment, and admin reset.
  - Prevents password reuse (new password cannot match current password).
  - Added `passwordUpdatedAt` timestamp to User schema and JWT `iat` verification to immediately revoke tokens issued prior to a password change.
  - Updated seed scripts (`seedAdmin.ts`, `seedStaff.ts`) to conform to the strong password policy.

## 6. Demand Forecasting (`(owner)/forecast.tsx` & `api/reports/forecast+api.ts`)
- **Automated Consumption & Stockout Analysis**:
  - Scans historical `RELEASE` transactions to compute average daily bottle consumption per product.
  - Projects exact days until stockout and recommends plant reorder dates.
  - Calculates 4-week demand trends (Rising, Falling, Stable) using weekly aggregation.
  - Categorizes inventory urgency: Critical (<= 3 days or depleted), Warning (<= 7 days or below reorder threshold), OK, and Overstocked.
- **Configurable Analysis Lookback Window**:
  - Owner can toggle between 7, 14, 30, 60, or 90-day lookback periods to adapt to sudden demand surges (fiestas/holidays) vs. smooth monthly averages.
- **Multi-Point App Navigation**:
  - Dedicated screen in Owner layout: `(owner)/forecast.tsx`.
  - Header dropdown menu ("Demand Forecasting").
  - Settings screen under OWNER CONTROLS section.
  - Dashboard banner shortcut and Reports screen shortcut card.

## 7. Cloud Data Backup & Disaster Recovery (`(owner)/backup.tsx` & `api/backup/export+api.ts`)
- **Memory-Safe JSON Snapshots**:
  - Exports products, current stock levels, and user directory (password hashes strictly omitted).
  - Designed with 3 memory-safe scopes to eliminate V8 heap out-of-memory errors on large collections:
    1. **Products & Stock Levels**: Fast catalog & current stock snapshot (ideal for routine recovery).
    2. **Recent Activity (Last 30 Days)**: Products, users, and all deliveries/releases/adjustments from the past month.
    3. **Standard Archive**: Products, users, and the latest 1,000 transactions.
- **Cross-Platform Exporting**:
  - On Web/Desktop: Direct `.json` file download to the user's Downloads folder via Blob and object URL.
  - On Mobile: Native Share sheet integration to save to Google Drive, WhatsApp, Files, or email.
- **Immediate Auto-Sync on Transactions**:
  - Updated `release.tsx`, `delivery.tsx`, and `adjustment.tsx` to immediately trigger background cloud sync (`syncNow()`) when online, preventing transactions from sitting in local queue when internet is active.

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
7. **Node.js Heap Out of Memory on Backup**: fixed by replacing unbounded `Transaction.find({})` queries with scoped, projected, and chunked queries, avoiding 4GB V8 heap crashes.
8. **Pending sync flag when online**: operational transaction screens now auto-trigger background sync immediately upon submission when online.

## Security / hardening
- Login throttling (429 after repeated failures), equal timing for unknown user vs wrong password,
  and account-deactivated status only revealed after a correct password (`rateLimit.ts`, `login+api.ts`).
- Internal error text is no longer sent to clients (`response.ts`). Set `EXPOSE_ERROR_DETAILS=true`
  only while debugging.
- Batch sync no longer leaks raw database errors; temporary server errors are returned in a new
  `deferred` list and retried without using up retries.
- Product duplicate check escapes user text before building a RegExp.
- Strong password policy enforced both client and server side.
- Password hashes excluded from all backup and public user endpoints.

## New features
- **Product Management screen** (owner): list, add, edit, deactivate/reactivate.
- **Reports screen** (owner): replenishment alerts + movement summary by period and type.
- **Demand Forecasting screen & API** (owner): automated daily demand, stockout days, reorder dates, and 7-90 day lookback toggle.
- **Cloud Backup & Export screen & API** (owner): scoped JSON snapshots with web download and mobile native share.
- **Visual Password Strength Meter**: real-time strength assessment in change, enrollment, and reset modals.

## Cleanup
- Removed the `mock-prod-*` shim from the sync API and the fake-product seeding on app start.
  **Sync every phone BEFORE deploying this if any still hold unsynced transactions for mock products.**
- Removed the hardcoded `D:\` path from `AI-CONTEXT.md`.

## Tests
`cd mobile && npm test` runs unit tests (validation, stock math, login throttle).

## Not changed (by design)
- `/api/sync/downstream` still returns the whole active catalog. The phone's cleanup logic relies
  on seeing the full list, so adding `since` filtering would need a client change as well.
- The login throttle is in server memory. Fine for one server; use a shared store if you run several.

