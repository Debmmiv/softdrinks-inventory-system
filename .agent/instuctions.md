# Project Instructions & File Structure

This document outlines the standard project architecture, directory structure, and module responsibilities for the **Offline-First Soft Drinks Inventory System**.

---

## ⚠️ Mandatory Agent Implementation Guideline

> [!IMPORTANT]
> **ALWAYS READ THE RULES FIRST BEFORE IMPLEMENTING:**
> Whenever an AI agent is working on, implementing, generating, or modifying code in this repository, the agent **MUST ALWAYS read and strictly adhere to all rule documents in the `.agent/rules/` directory** before writing any code:
> 
> 1. [`.agent/rules/1. coding-standard.md`](file:///C:/Users/Nitro/Desktop/Projects/School/softdrinks-inventory-system/.agent/rules/1.%20coding-standard.md) — Coding conventions, architectural patterns, state management, and type-safety standards.
> 2. [`.agent/rules/2. ui-and-ux-standard.md`](file:///C:/Users/Nitro/Desktop/Projects/School/softdrinks-inventory-system/.agent/rules/2.%20ui-and-ux-standard.md) — UI design rules, case/bottle dual-input usability, color schemes, offline alerts, and accessibility standards.
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
├── backend/                                # Node.js & Express REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                       # MongoDB Atlas Mongoose connection
│   │   ├── controllers/
│   │   │   ├── authController.js           # Login, token validation, user creation
│   │   │   ├── productController.js        # Product CRUD & reorder thresholds
│   │   │   ├── reportController.js         # Stock summaries, movement by date
│   │   │   └── syncController.js           # Batch transaction sync & duplicate check
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js           # JWT verification & role authorization
│   │   │   └── errorMiddleware.js          # Central error handling
│   │   ├── models/
│   │   │   ├── Product.js                  # Product schema (brand, pack size, stock)
│   │   │   ├── Transaction.js              # Transaction schema (UUID, cases, bottles)
│   │   │   └── User.js                     # User schema (username, role, hashed password)
│   │   └── routes/
│   │       ├── authRoutes.js               # /api/auth endpoints
│   │       ├── productRoutes.js            # /api/products endpoints
│   │       ├── reportRoutes.js             # /api/reports endpoints
│   │       └── syncRoutes.js               # /api/sync endpoints
│   ├── .env.example                        # Template for backend environment variables
│   ├── index.js                            # Express app entry point
│   ├── package.json
│   └── package-lock.json
│
├── mobile/                                 # Expo & React Native App (TypeScript)
│   ├── assets/                             # App icons, splash screens, assets
│   ├── src/
│   │   ├── api/                            # Backend API communication
│   │   │   ├── client.ts                   # Axios base client with auth interceptors
│   │   │   └── syncApi.ts                  # Batch upload & download endpoints
│   │   │
│   │   ├── components/                     # Reusable UI components
│   │   │   ├── CaseBottleInput.tsx         # Dual numeric input for cases & bottles
│   │   │   ├── NetworkBanner.tsx           # Online / Offline connectivity status bar
│   │   │   ├── StockItemCard.tsx           # Product item card displaying cases & bottles
│   │   │   ├── SyncBadge.tsx               # Header badge showing pending queue count
│   │   │   └── TransactionRow.tsx          # History log item component
│   │   │
│   │   ├── context/                        # Global State Management
│   │   │   ├── AuthContext.tsx             # User session, login/logout, role state
│   │   │   ├── InventoryContext.tsx        # Local product list and stock state
│   │   │   └── SyncContext.tsx             # Network listener & pending queue state
│   │   │
│   │   ├── database/                       # Local SQLite Database (Offline-First)
│   │   │   ├── db.ts                       # SQLite connection & table initialization
│   │   │   ├── productRepo.ts              # Local products CRUD & stock queries
│   │   │   └── transactionRepo.ts          # Local transactions & sync queue operations
│   │   │
│   │   ├── navigation/                     # React Navigation Routing
│   │   │   ├── AppNavigator.tsx            # Root navigator (Auth vs Authenticated)
│   │   │   ├── AuthNavigator.tsx           # Login stack
│   │   │   ├── OwnerNavigator.tsx          # Tab/Drawer navigation for Owner/Manager
│   │   │   ├── StaffNavigator.tsx          # Tab navigation for Staff
│   │   │   └── types.ts                    # RootStackParamList & navigation types
│   │   │
│   │   ├── screens/                        # Application Screens
│   │   │   ├── AdjustmentScreen.tsx        # FR14: Record stock adjustments & reasons
│   │   │   ├── DashboardScreen.tsx         # FR15, FR16, FR26, FR27: Overview of stock, sync status
│   │   │   ├── DeliveryScreen.tsx          # FR11, FR30: Record supplier deliveries & DR references
│   │   │   ├── LoginScreen.tsx             # FR1, FR2, FR3, FR4: Role-based auth & offline cache
│   │   │   ├── ProductFormScreen.tsx       # FR8, FR9, FR10: Add/edit product & reorder levels
│   │   │   ├── ProductListScreen.tsx       # FR8, FR15, FR27: Searchable product catalog
│   │   │   ├── ReleaseScreen.tsx           # FR12, FR13, FR30: Customer release, stock checks & refs
│   │   │   ├── ReportsScreen.tsx           # FR25, FR26: Stock levels, movements, replenishment
│   │   │   ├── SettingsScreen.tsx          # FR5, FR28: App settings, change password, device ID, logout
│   │   │   ├── StaffEnrollmentScreen.tsx   # FR6: Owner-only enrollment of staff accounts
│   │   │   ├── SyncQueueScreen.tsx         # FR17, FR18, FR19, FR22, FR31: Queue status, retry & downstream sync
│   │   │   ├── TransactionHistoryScreen.tsx # FR24, FR30: Immutable audit log & customer/supplier tags
│   │   │   └── UserManagementScreen.tsx    # FR4, FR7, FR29: Owner manage accounts & password reset
│   │   │
│   │   ├── services/                       # Business & Background Logic
│   │   │   ├── networkService.ts           # NetInfo event listeners & status checks
│   │   │   └── syncEngine.ts               # Background/manual sync processor & retries
│   │   │
│   │   ├── types/                          # TypeScript Interfaces & Types
│   │   │   ├── inventory.ts                # Product, Case, and Bottle interfaces
│   │   │   ├── sync.ts                     # SyncStatus, QueueItem, BatchPayload
│   │   │   ├── transaction.ts              # Transaction, TransactionType, Reason
│   │   │   └── user.ts                     # User, Role ('STAFF' | 'OWNER')
│   │   │
│   │   └── utils/                          # Helper Utilities
│   │       ├── calculations.ts             # toTotalBottles & toCasesAndBottles helpers
│   │       ├── constants.ts                # Enums, storage keys, default limits
│   │       └── date.ts                     # Date formatting helpers for audit logs
│   │
│   ├── App.tsx                             # Expo root entry point
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

### 1. `mobile/src/database/` (Offline-First SQLite)
- All writes (deliveries, releases, adjustments) are saved locally into SQLite first.
- Generates a UUID for every transaction before storing it.
- Never directly mutates historical transaction rows (append-only ledger).

### 2. `mobile/src/services/syncEngine.ts`
- Listens for network restoration via `@react-native-community/netinfo`.
- Reads transactions with status `PENDING` from SQLite and sends them in batches to the backend.
- Marks transactions as `SYNCED` on success, or `FAILED` with an error description on rejection.

### 3. `mobile/src/utils/calculations.ts`
- Converts cases and bottles to single bottle units: `total_bottles = (cases * units_per_case) + loose_bottles`.
- Deconstructs bottle totals into cases and remaining loose bottles for UI presentation.

### 4. `mobile/src/navigation/`
- Enforces strict role-based access control (RBAC) and view isolation:
  - **Staff Role**: Access restricted strictly to Dashboard, Record Delivery, Record Release, Stock Adjustment, Sync Queue, Catalog, and Settings (with self-service password change). All administrative menus and screens are strictly hidden from staff.
  - **Owner Role**: Full access including Product Management, User Management, Staff Enrollment, and Reports.
