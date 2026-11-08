# 🤖 AI Assistant Context & Architectural Primer (AGENTS / AI READ FIRST)

> [!IMPORTANT]
> **TO ANY AI AGENT WORKING ON THIS REPOSITORY:**
> Read this document completely before generating or editing code. This file is the single source of truth for architecture, domain rules, file structure, and implementation status.

---

## 1. Project Overview & Business Domain

- **App Name:** Soft Drinks Inventory System (Gusa Wholesale Depot)
- **Domain:** Wholesale soft drinks warehouse distribution tracking physical bottles and cases.
- **Target Platform:** Handheld Android devices (Android 10 to 14, API 29+) operated by floor warehouse staff and business owners.
- **Core Architecture:** **Offline-First Full-Stack Expo Application** using **Expo Router** with co-located **Node.js API Routes** (`+api.ts`) and **MongoDB Atlas** cloud storage.

---

## 2. Core Mental Model (The 3 Strict Laws)

```
[ Phone Screen (React Native UI) ]
             ↕ (Instant read/write, 0ms)
[ Local SQLite DB on Flash Storage (expo-sqlite with WAL) ]
             ↕ (Batch upload via SyncEngine when online)
[ Expo Router API Routes (+api.ts on Node.js) ]
             ↕ (Mongoose singleton with connection pooling)
[ MongoDB Atlas Central Cloud DB ]
```

1. **Law 1: Mobile UI components NEVER connect directly to MongoDB Atlas.**
   - React Native has no MongoDB driver and holds zero cloud database credentials.
   - All mobile screens read from and write **exclusively to local SQLite** (`softdrinks.db`).
   - The app must work 100% in Airplane Mode with zero network latency.

2. **Law 2: Server API Routes NEVER touch SQLite.**
   - SQLite exists physically on staff phone flash storage.
   - Expo Router API Routes (`src/app/api/*+api.ts`) run in the Node.js server runtime and talk **exclusively to MongoDB Atlas** via Mongoose models.

3. **Law 3: The Sync Engine is the asynchronous bridge.**
   - It reads `PENDING` records from the SQLite `sync_queue` table and POSTs them FIFO to `/api/sync/batch`.
   - On HTTP 200 receipt, it marks local records as `SYNCED`.

---

## 3. Strict Business & Inventory Rules

1. **Unit of Record:**
   - All inventory is internally stored and calculated as **total raw bottles**:
     $$\text{total\_bottles} = (\text{cases} \times \text{units\_per\_case}) + \text{loose\_bottles}$$
   - Displayed everywhere in UI using [`toCasesAndBottles()`](file:///D:/softdrinks-app/softdrinks-inventory-system/mobile/src/client/utils/calculations.ts) as `"X cases and Y bottles"`.
2. **Pack Size Immutability (FR9):**
   - Once a product has at least one recorded transaction, its `units_per_case` pack size attribute is **IMMUTABLE**. Never allow updating `units_per_case` if transactions exist.
3. **Append-Only Ledger (FR24):**
   - Transactions are **NEVER edited or deleted**. Corrections are recorded strictly as new `ADJUSTMENT` transactions with a mandatory reason (`breakage`, `damage`, `loss`, `count_correction`).
4. **Outgoing Stock Guardrail (FR13):**
   - Any customer release transaction where `requested_bottles > available_stock` must be immediately blocked at the UI and repository level. Negative stock is strictly prohibited on single-device releases.
5. **Idempotency Guarantee (NFR3):**
   - Every transaction gets a client-generated RFC4122 UUIDv4.
   - MongoDB `Transaction` collection enforces `{ uuid: { unique: true } }`.
   - `/api/sync/batch` checks UUID existence before touching product stock. Re-sent duplicates return HTTP 200 without double-counting stock.
6. **Multi-Device Concurrency Deficit (NFR13):**
   - If two offline phones concurrently release stock that exceeds total warehouse inventory, the backend accepts both valid offline transactions, updates stock (even if negative), and flags the record with `discrepancy_flag = 'CONCURRENCY_DEFICIT'` for owner audit reconciliation.

---

## 4. Complete Directory & Module Architecture

```text
mobile/
├── assets/                                 # App icons & adaptive launch screen
├── src/
│   ├── app/                                # EXPO ROUTER (File-Based Routing)
│   │   ├── (auth)/                         # Auth stack
│   │   │   ├── _layout.tsx
│   │   │   └── login.tsx                   # FR2, FR3: Offline-cached login
│   │   ├── (tabs)/                         # Main operational tab navigator
│   │   │   ├── _layout.tsx                 # Tab bar with role gating & sync badge
│   │   │   ├── index.tsx                   # FR15, FR26: Dashboard & stock summaries
│   │   │   ├── delivery.tsx                # FR11, FR30: Supplier deliveries
│   │   │   ├── release.tsx                 # FR12, FR13, FR30: Customer releases
│   │   │   ├── adjustment.tsx              # FR14: Breakage/damage adjustments
│   │   │   ├── catalog.tsx                 # FR8, FR27: Searchable product catalog
│   │   │   ├── history.tsx                 # FR24: Immutable audit history
│   │   │   ├── sync.tsx                    # FR17, FR19: Sync queue outbox display
│   │   │   └── settings.tsx                # FR5, FR28: Profile, device ID & logout
│   │   ├── (owner)/                        # Owner managerial protected screens
│   │   │   ├── _layout.tsx
│   │   │   ├── reports.tsx                 # FR25, FR26: Inventory deficit reports
│   │   │   ├── products/index.tsx          # FR8, FR9, FR10: Product management
│   │   │   └── users/                      # FR6, FR7, FR29: User administration
│   │   │       ├── index.tsx
│   │   │       └── enroll.tsx
│   │   │
│   │   ├── api/                            # EXPO ROUTER API ROUTES (Node.js backend)
│   │   │   ├── health+api.ts               # GET /api/health
│   │   │   ├── auth/
│   │   │   │   ├── login+api.ts            # POST /api/auth/login
│   │   │   │   ├── change-password+api.ts  # POST /api/auth/change-password
│   │   │   │   ├── users/
│   │   │   │   │   ├── index+api.ts        # GET /api/auth/users
│   │   │   │   │   └── [id]/status+api.ts  # PATCH /api/auth/users/:id/status
│   │   │   │   └── admin/
│   │   │   │       ├── enroll+api.ts       # POST /api/auth/admin/enroll
│   │   │   │       └── reset-password+api.ts # POST /api/auth/admin/reset-password
│   │   │   ├── products/
│   │   │   │   ├── index+api.ts            # GET /api/products, POST /api/products
│   │   │   │   └── [id]+api.ts             # PATCH /api/products/:id
│   │   │   ├── sync/
│   │   │   │   ├── batch+api.ts            # POST /api/sync/batch (FIFO idempotent)
│   │   │   │   └── downstream+api.ts       # GET /api/sync/downstream
│   │   │   └── reports/
│   │   │       ├── summary+api.ts          # GET /api/reports/summary
│   │   │       └── replenishment+api.ts    # GET /api/reports/replenishment
│   │   └── _layout.tsx                     # Root provider wrapper & auth redirect
│   │
│   ├── client/                             # CLIENT-SIDE ENGINE (Handheld)
│   │   ├── context/                        # Global state
│   │   │   ├── AuthContext.tsx             # User session, device ID, login/logout
│   │   │   ├── InventoryContext.tsx        # In-memory product cache & stock
│   │   │   └── SyncContext.tsx             # Outbox queue counters & status
│   │   ├── database/                       # Local SQLite Layer (expo-sqlite)
│   │   │   ├── db.ts                       # WAL initialization & table DDL
│   │   │   ├── productRepo.ts              # Local catalog queries & mock seeder
│   │   │   └── transactionRepo.ts          # Atomic ledger & sync outbox ops
│   │   ├── types/                          # TypeScript definitions
│   │   │   ├── inventory.ts
│   │   │   ├── sync.ts
│   │   │   ├── transaction.ts
│   │   │   └── user.ts
│   │   └── utils/                          # Calculations & constants
│   │       ├── calculations.ts             # FR15 conversion engine
│   │       ├── constants.ts
│   │       └── date.ts
│   │
│   └── server/                             # SERVER-SIDE MODULES (Backend Core)
│       ├── config/
│       │   └── db.ts                       # MongoDB connection singleton & pool
│       ├── middleware/                     # Auth & response helpers
│       │   ├── auth.ts                     # JWT verification & requireOwner guard
│       │   └── response.ts                 # jsonOk & jsonError helpers
│       ├── models/                         # Mongoose Models
│       │   ├── Product.ts
│       │   ├── Transaction.ts              # Unique index on uuid
│       │   └── User.ts
│       └── scripts/
│           ├── seedAdmin.ts                # FR1: CLI Admin Provisioning Tool
│           └── testEndpoints.ts            # Automated API integration test suite
│
├── .env                                    # Local configuration (never commit!)
├── .env.example                            # Configuration template
├── package.json                            # Unified package manifest
└── tsconfig.json                           # TypeScript path aliases (@/* -> ./src/*)
```

---

## 5. Current Implementation Status

| Phase | Milestone | Status | Notes |
|---|---|:---:|---|
| **Phase 1** | Local SQLite Engine & Temporary UI | ✅ Complete | WAL mode, atomic `recordTransaction()`, FR15 math, temporary UI screens |
| **Phase 2** | MongoDB Atlas & Cloud API Routes | ✅ Complete | 12 API routes built, tested against live Atlas cluster, idempotency verified |
| **Phase 3** | Client Background Sync Engine | ⏳ **NEXT** | Wire `syncEngine.ts`, NetInfo event listener, and manual "Sync Now" button |

---

## 6. Phase 3 Implementation Directives (What to Build Next)

When starting Phase 3, implement the following:

1. **`src/client/services/networkService.ts`**:
   - Subscribe to `@react-native-community/netinfo`.
   - Notify `SyncContext` on online/offline state transitions.
2. **`src/client/services/syncEngine.ts`**:
   - `syncPendingTransactions()`:
     1. Read `getPendingQueue()` from SQLite (`PENDING` or `FAILED`).
     2. If empty, return.
     3. Mark items as `SYNCING` to prevent duplicate parallel transmissions.
     4. `POST /api/sync/batch` with `{ transactions: [...] }`.
     5. For UUIDs in `synced` array: call `markSynced(uuid)`.
     6. For UUIDs in `failed` array: call `markFailed(uuid, error)`.
   - `syncDownstreamCatalog()`:
     1. Call `GET /api/sync/downstream?since=<last_sync_timestamp>`.
     2. Update local SQLite `products` table via `upsertProduct()`.
     3. Trigger `InventoryContext.refresh()`.
3. **Connect to UI**:
   - Trigger auto-sync when network returns (within 5 seconds per FR18).
   - Wire manual "Sync Now" button in [`src/app/(tabs)/sync.tsx`](file:///D:/softdrinks-app/softdrinks-inventory-system/mobile/src/app/(tabs)/sync.tsx) (FR19).

---

## 7. Operational Commands

Always run from `mobile/`:
- `npx expo start` — Start dev server
- `npm run test:api` — Run end-to-end API test suite
- `npm run seed:admin` — Run admin CLI account creator
- `npx tsc --noEmit` — Type-check (must always pass with 0 errors)
- `npx expo-doctor` — Health-check dependencies (must pass 20/20)
