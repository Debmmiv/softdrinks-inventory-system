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
│   │   ├── api/                            # Client HTTP Axios Bridge
│   │   │   ├── client.ts                   # Axios singleton with Bearer token interceptor
│   │   │   └── syncApi.ts                  # Typed endpoints (batch, downstream, auth, admin)
│   │   ├── context/                        # Global state
│   │   │   ├── AuthContext.tsx             # Hybrid online/offline auth & SecureStore tokens
│   │   │   ├── InventoryContext.tsx        # In-memory product cache & stock
│   │   │   └── SyncContext.tsx             # Outbox queue counters, online status & sync trigger
│   │   ├── database/                       # Local SQLite Layer (expo-sqlite)
│   │   │   ├── db.ts                       # WAL initialization & table DDL
│   │   │   ├── productRepo.ts              # Local catalog queries & upserts
│   │   │   └── transactionRepo.ts          # Atomic ledger & sync outbox ops
│   │   ├── services/                       # Reactive Device Services
│   │   │   ├── networkService.ts           # NetInfo connectivity subscription
│   │   │   └── syncEngine.ts               # Bidirectional upstream/downstream sync coordinator
│   │   ├── types/                          # TypeScript definitions
│   │   │   ├── inventory.ts
│   │   │   ├── sync.ts
│   │   │   ├── transaction.ts
│   │   │   └── user.ts
│   │   └── utils/                          # Calculations & constants
│   │       ├── calculations.ts             # FR15 conversion engine
│   │       ├── constants.ts                # Dynamic LAN IP / hostUri resolver
│   │       ├── crypto.ts                   # React Native Hermes bcrypt PRNG polyfill
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
│           ├── seedStaff.ts                # CLI Staff Enrollment Tool
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
| **Phase 3** | Client Background Sync Engine & Cloud Auth | ✅ Complete | Bidirectional sync engine, NetInfo listener, hybrid cloud/offline bcrypt auth, in-app staff enrollment |
| **Phase 4** | Owner Administration & Production Polish | ⏳ **NEXT** | Product management CRUD UI, live replenishment/summary reports UI, visual polish |

---

## 6. Phase 3 Architecture Summary (Completed Deliverables)

1. **Bidirectional Synchronization Coordinator (`syncEngine.ts`)**:
   - **Upstream Push (`syncUpstream`)**: Transmits `PENDING`/`FAILED` transactions in FIFO order to `/api/sync/batch`. Marks successful transactions as `SYNCED` and server-rejected transactions as `FAILED` with specific error reasons.
   - **Downstream Pull (`syncDownstream`)**: Pulls catalog modifications and authoritative warehouse stock counts from `/api/sync/downstream?since=timestamp`, upserting into SQLite and purging legacy placeholder mock products.
   - **Full Sync Coordinator (`syncAll`)**: Orchestrates upstream push followed by downstream pull, automatically refreshing in-memory inventory state.
2. **Reactive Network Detector (`networkService.ts`)**:
   - Subscribes to `@react-native-community/netinfo` to capture online/offline transitions without wasteful polling loops.
   - When transitioning from offline to online, immediately triggers background sync (FR18).
3. **Hybrid Cloud + Offline Authentication (`AuthContext.tsx` & `crypto.ts`)**:
   - First verifies credentials online via `POST /api/auth/login`. On success, caches salted bcrypt hash in SQLite `users_cache` and stores JWT in `expo-secure-store`.
   - If offline, authenticates against `users_cache` using device-side bcrypt.
   - Polyfilled `bcrypt.setRandomFallback` with `expo-crypto`'s native PRNG for React Native Hermes.
4. **Dynamic Host Resolution (`constants.ts`)**:
   - Extracts Metro's LAN IP from `Constants.expoConfig?.hostUri` so physical Android devices on Wi-Fi reach the Node.js API routes on the host machine without hardcoded configurations.
5. **In-App Staff Management (`(owner)/users/enroll.tsx` & `(owner)/users/index.tsx`)**:
   - Owner can enroll new warehouse staff with temporary credentials directly from their mobile phone, toggle active status, and reset passwords.

---

## 7. Phase 4 Implementation Directives (What to Build Next)

1. **Product Catalog Management UI (`(owner)/products/index.tsx`)**:
   - Create new products (`POST /api/products`).
   - Edit reorder alert thresholds and product names (`PATCH /api/products/:id`).
   - Guard pack size immutability if transactions exist (FR9).
2. **Cloud Reports & Deficit Analytics UI (`(owner)/reports.tsx`)**:
   - Real-time stock replenishment alerts (`GET /api/reports/replenishment`) highlighting products below threshold (FR26).
   - Date-filtered movement summaries (`GET /api/reports/summary`) with delivery vs release vs adjustment totals (FR25).
3. **End-to-End System Polish & Final Verification**:
   - Verify multi-user concurrent offline operations.
   - Run `npx expo-doctor` and `npx tsc --noEmit` on final build.

---

## 8. Operational Commands

Always run from `mobile/`:
- `npx expo start` — Start dev server (Metro bundler + server API routes)
- `npm run test:api` — Run end-to-end API test suite
- `npm run seed:admin` — Run admin CLI account creator
- `npm run enroll:staff` — Run staff CLI account creator
- `npx tsc --noEmit` — Type-check (must always pass with 0 errors)
- `npx expo-doctor` — Health-check dependencies (must pass 20/20)
