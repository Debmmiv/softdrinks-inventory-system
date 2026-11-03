# Project Instructions & File Structure

This document outlines the standard project architecture, directory structure, and module responsibilities for the **Offline-First Soft Drinks Inventory System**, implemented as a unified full-stack application using **Expo Router** and **Expo API Routes**.

---

## ⚠️ Mandatory Agent Implementation Guideline

> [!IMPORTANT]
> **ALWAYS READ THE RULES FIRST BEFORE IMPLEMENTING:**
> Whenever an AI agent is working on, implementing, generating, or modifying code in this repository, the agent **MUST ALWAYS read and strictly adhere to all rule documents in the `.agent/rules/` directory** before writing any code:
> 
> 1. [`.agent/rules/1. coding-standard.md`](file:///D:/softdrinks-app/softdrinks-inventory-system/.agent/rules/1.%20coding-standard.md) — Coding conventions, architectural patterns, state management, and type-safety standards.
> 2. [`.agent/rules/2. ui-and-ux-standard.md`](file:///D:/softdrinks-app/softdrinks-inventory-system/.agent/rules/2.%20ui-and-ux-standard.md) — UI design rules, case/bottle dual-input usability, color schemes, offline alerts, and accessibility standards.
> 3. Any additional rule files that may be placed under `.agent/rules/`.
> 
> **Never bypass or skip reading `.agent/rules/` prior to implementation.**

---

## Complete Project Directory Tree

```text
softdrinks-inventory-system/
├── .agent/                                 # Agent rules, skills, and instructions
│   ├── rules/
│   │   ├── 1. coding-standard.md
│   │   └── 2. ui-and-ux-standard.md
│   ├── skills/
│   │   ├── development/SKILL.md
│   │   ├── quality-assurance/SKILL.md
│   │   └── researcher/SKILL.md
│   └── instuctions.md                      # This file
│
├── mobile/                                 # Full-Stack Expo App (Client & Server API Routes)
│   ├── assets/                             # App icons, splash screens, assets
│   ├── src/
│   │   ├── app/                            # Expo Router Navigation & API Routes
│   │   │   ├── (auth)/                     # Unauthenticated Flow
│   │   │   │   └── login.tsx               # FR1, FR2, FR3, FR4: Role-based login screen
│   │   │   ├── (tabs)/                     # Main Operational Staff & Owner Tabs
│   │   │   │   ├── _layout.tsx             # Tab bar layout with role-based visibility
│   │   │   │   ├── index.tsx               # FR15, FR16, FR26, FR27: Dashboard & inventory overview
│   │   │   │   ├── delivery.tsx            # FR11, FR30: Record supplier delivery
│   │   │   │   ├── release.tsx             # FR12, FR13, FR30: Customer stock release
│   │   │   │   ├── adjustment.tsx          # FR14: Stock adjustments (breakage, damage, etc.)
│   │   │   │   ├── catalog.tsx             # FR8, FR15, FR27: Searchable product catalog
│   │   │   │   ├── history.tsx             # FR24, FR30: Immutable transaction audit log
│   │   │   │   ├── sync.tsx                # FR17, FR18, FR19, FR22: Sync queue & retry triggers
│   │   │   │   └── settings.tsx            # FR5, FR28: Profile, diagnostics, logout, change password
│   │   │   ├── (owner)/                    # Owner/Manager Only Protected Routes
│   │   │   │   ├── products/
│   │   │   │   │   ├── index.tsx           # FR8, FR9, FR10: Product management
│   │   │   │   │   └── [id].tsx            # Product form / edit
│   │   │   │   ├── users/
│   │   │   │   │   ├── index.tsx           # FR4, FR7, FR29: User management & password reset
│   │   │   │   │   └── enroll.tsx          # FR6: Staff account provisioning
│   │   │   │   └── reports.tsx             # FR25, FR26: Inventory summaries & replenishment list
│   │   │   ├── api/                        # Expo Router API Routes (Backend Endpoints)
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login+api.ts        # POST /api/auth/login
│   │   │   │   │   ├── change-password+api.ts # POST /api/auth/change-password
│   │   │   │   │   ├── users/
│   │   │   │   │   │   ├── index+api.ts    # GET /api/auth/users
│   │   │   │   │   │   └── [id]/status+api.ts # PATCH /api/auth/users/:id/status
│   │   │   │   │   └── admin/
│   │   │   │   │       ├── enroll+api.ts   # POST /api/auth/admin/enroll
│   │   │   │   │       └── reset-password+api.ts # POST /api/auth/admin/reset-password
│   │   │   │   ├── products/
│   │   │   │   │   ├── index+api.ts        # GET & POST /api/products
│   │   │   │   │   └── [id]+api.ts         # PATCH /api/products/:id
│   │   │   │   ├── sync/
│   │   │   │   │   ├── batch+api.ts        # POST /api/sync/batch (FIFO idempotent sync)
│   │   │   │   │   └── downstream+api.ts   # GET /api/sync/downstream
│   │   │   │   ├── reports/
│   │   │   │   │   ├── summary+api.ts      # GET /api/reports/summary
│   │   │   │   │   └── replenishment+api.ts # GET /api/reports/replenishment
│   │   │   │   └── health+api.ts           # GET /api/health
│   │   │   └── _layout.tsx                 # Root layout & providers
│   │   │
│   │   ├── server/                         # Server-Side Backend Modules (for API Routes)
│   │   │   ├── config/
│   │   │   │   └── db.ts                   # MongoDB Atlas Mongoose connection singleton
│   │   │   ├── models/                     # Central MongoDB Mongoose Schemas
│   │   │   │   ├── Product.ts              # Product schema (brand, pack size, stock)
│   │   │   │   ├── Transaction.ts          # Transaction schema (UUID, cases, bottles)
│   │   │   │   └── User.ts                 # User schema (username, role, hashed password)
│   │   │   ├── middleware/                 # Server Middleware & Auth Helpers
│   │   │   │   ├── auth.ts                 # JWT verification & role authorization
│   │   │   │   └── response.ts             # Standard JSON response formatting
│   │   │   └── scripts/
│   │   │       └── seedAdmin.ts            # CLI Admin Injection Script (npm run seed:admin)
│   │   │
│   │   ├── client/                         # Client-Side Application Code
│   │   │   ├── api/                        # Client API communication
│   │   │   │   ├── client.ts               # Base HTTP client with JWT interceptor
│   │   │   │   └── syncApi.ts              # Batch upload & downstream reconciliation endpoints
│   │   │   ├── components/                 # Reusable UI components
│   │   │   │   ├── CaseBottleInput.tsx     # Dual numeric input for cases & bottles
│   │   │   │   ├── NetworkBanner.tsx       # Online / Offline connectivity status bar
│   │   │   │   ├── StockItemCard.tsx       # Product item card displaying cases & bottles
│   │   │   │   ├── SyncBadge.tsx           # Header badge showing pending queue count
│   │   │   │   └── TransactionRow.tsx      # History log item component
│   │   │   ├── context/                    # Global State Management
│   │   │   │   ├── AuthContext.tsx         # User session, login/logout, role state
│   │   │   │   ├── InventoryContext.tsx    # Local product list and stock state
│   │   │   │   └── SyncContext.tsx         # Network listener & pending queue state
│   │   │   ├── database/                   # Local SQLite Database (Offline-First)
│   │   │   │   ├── db.ts                   # SQLite connection & table initialization
│   │   │   │   ├── productRepo.ts          # Local products CRUD & stock queries
│   │   │   │   └── transactionRepo.ts      # Local transactions & sync queue operations
│   │   │   ├── services/                   # Business & Background Logic
│   │   │   │   ├── networkService.ts       # NetInfo event listeners & status checks
│   │   │   │   └── syncEngine.ts           # Background/manual sync processor & retries
│   │   │   ├── types/                      # Shared & Client Types
│   │   │   │   ├── inventory.ts            # Product, Case, and Bottle interfaces
│   │   │   │   ├── sync.ts                 # SyncStatus, QueueItem, BatchPayload
│   │   │   │   ├── transaction.ts          # Transaction, TransactionType, Reason
│   │   │   │   └── user.ts                 # User, Role ('STAFF' | 'OWNER')
│   │   │   └── utils/                      # Helper Utilities
│   │   │       ├── calculations.ts         # toTotalBottles & toCasesAndBottles helpers
│   │   │       ├── constants.ts            # Enums, storage keys, default limits
│   │   │       └── date.ts                 # Date formatting helpers for audit logs
│   │
│   ├── app.json                            # Expo configuration
│   ├── package.json
│   └── tsconfig.json                       # TypeScript compiler configuration
│
├── .gitignore
├── needed-dependencies.md                  # Complete dependency list & install commands
└── README.md                               # Project requirements & specifications
```

---

## Module Responsibilities

### 1. `mobile/src/client/database/` (Offline-First SQLite)
- All writes (deliveries, releases, adjustments) are saved locally into SQLite first.
- Generates a UUID for every transaction before storing it.
- Never directly mutates historical transaction rows (append-only ledger).

### 2. `mobile/src/client/services/syncEngine.ts`
- Listens for network restoration via `@react-native-community/netinfo`.
- Reads transactions with status `PENDING` from SQLite and sends them in batches to `/api/sync/batch`.
- Marks transactions as `SYNCED` on success, or `FAILED` with an error description on rejection.

### 3. `mobile/src/app/api/` (Expo Router API Routes)
- Server-side route handlers running in Node.js runtime.
- Processes incoming batches, checks UUID idempotency against MongoDB Atlas, and atomically updates centralized product inventory.
- Serves authentication, reports, product management, and downstream reconciliation endpoints.

### 4. `mobile/src/server/` (Central DB & Mongoose Models)
- Maintains MongoDB Atlas connection singleton via Mongoose.
- Hosts Mongoose models for `User`, `Product`, and `Transaction`.
- Hosts CLI script for admin bootstrapping (`seedAdmin.ts`).

### 5. `mobile/src/client/utils/calculations.ts`
- Converts cases and bottles to single bottle units: `total_bottles = (cases * units_per_case) + loose_bottles`.
- Deconstructs bottle totals into cases and remaining loose bottles for UI presentation.

### 6. `mobile/src/app/` (Expo Router UI & Role-Based Access Control)
- Enforces strict role-based access control (RBAC) and view isolation:
  - **Staff Role**: Access restricted strictly to Dashboard, Record Delivery, Record Release, Stock Adjustment, Sync Queue, Catalog, and Settings (with self-service password change). All administrative menus and screens are strictly hidden from staff.
  - **Owner Role**: Full access including Product Management, User Management, Staff Enrollment, and Reports.
