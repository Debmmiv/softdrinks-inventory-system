# Offline-First Soft Drinks Inventory System

An offline-first inventory management app for a soft drinks wholesale business in Gusa. Staff can record deliveries, releases, and stock adjustments in cases and individual bottles, even without internet. Pending transactions are synchronized to a central database when a connection returns.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo and React Native (Android) |
| Local database | SQLite |
| Backend API | Node.js and Express |
| Central database | MongoDB Atlas |

## How It Works

1. A user records a delivery, release, or adjustment in the mobile app.
2. The transaction is saved in SQLite with a unique ID (UUID) and a `PENDING` status.
3. When internet is available, the sync service sends pending transactions to the backend.
4. The backend validates each transaction, rejects duplicates, and updates MongoDB Atlas.
5. After confirmation, the app marks the transaction as `SYNCED` (or `FAILED` with a reason).

## Requirements

### Functional Requirements (FR)

| ID | Requirement |
|---|---|
| FR1 | The system shall predefine authorized users and their initial credentials via an environment configuration file (`.env`). |
| FR2 | The system shall let authorized users log in with their own account and role (staff or owner/manager). |
| FR3 | The system shall let the owner add, edit, and deactivate products, including brand, bottle size, and bottles per case. |
| FR4 | The system shall record deliveries from suppliers in cases and individual bottles. |
| FR5 | The system shall record product releases to customers in cases and individual bottles. |
| FR6 | The system shall record stock adjustments (breakage, loss, count correction) with a reason. |
| FR7 | The system shall automatically convert cases and bottles into total bottles using the product's case-pack size, and display stock as cases and remaining bottles. |
| FR8 | The system shall reject a release that exceeds the available stock and show an alert. |
| FR9 | The system shall store all products, stock, and transactions in a local SQLite database so users can view and update records without internet. |
| FR10 | The system shall assign a unique ID (UUID) to each transaction and place it in a sync queue with a `PENDING` status. |
| FR11 | The system shall detect internet connectivity and send pending transactions to the backend automatically. |
| FR12 | The backend shall validate each transaction, check for duplicate IDs, and reject duplicates. |
| FR13 | The backend shall store validated transactions and update the central stock records in MongoDB Atlas. |
| FR14 | The system shall mark transactions as `SYNCED` after confirmation, or `FAILED` with a reason, and retry failed submissions. |
| FR15 | The system shall keep a complete transaction history that cannot be deleted or edited. |
| FR16 | The system shall generate reports for current stock levels, stock movements by date, and products that need replenishment. |
| FR17 | The system shall let the owner manage user accounts (including enrolling new hires) and set the reorder level for each product. |

### Non-Functional Requirements (NFR)

| ID | Category | Requirement |
|---|---|---|
| NFR1 | Availability | The app shall perform all recording and viewing functions with no internet connection. |
| NFR2 | Reliability | No recorded transaction shall be lost, including when the app closes, the phone restarts, or a sync is interrupted. |
| NFR3 | Data integrity | A transaction shall never be counted twice, even if it is sent more than once. |
| NFR4 | Consistency | After synchronization, the stock totals on the device and in MongoDB Atlas shall match. |
| NFR5 | Performance | A transaction shall be saved locally and the new stock shown within 2 seconds. |
| NFR6 | Performance | A batch of 100 pending transactions shall synchronize within 1 minute on a stable connection. |
| NFR7 | Security | Passwords shall be stored hashed, and each user shall access only the functions allowed by their role. |
| NFR8 | Security | Database credentials shall be stored only on the backend, never in the mobile app, and data sent between app and backend shall use HTTPS. |
| NFR9 | Usability | Staff shall be able to record a delivery or release in a few steps, with minimal typing, using case and bottle fields. |
| NFR10 | Compatibility | The mobile app shall run on Android devices. |
| NFR11 | Maintainability | The code shall be organized into separate modules (mobile app, local database, sync, backend) so each can be changed or tested independently. |
| NFR12 | Auditability | Every transaction shall record the user, device, and time it was created. |

### Screen Requirements

| Screen | Description | Status / Path |
|---|---|---|
| Login Screen | Allows staff and owner/manager to log in using their credentials and role; authenticates locally/remotely and enforces role-based navigation and permissions (FR1, FR2, NFR7). | Planned (`mobile/src/screens/LoginScreen.tsx`) |
| Dashboard / Home Screen | Displays current inventory summary (cases and loose bottles), device network/sync status indicator, low-stock replenishment alerts, and quick-action shortcuts for recording deliveries, releases, and adjustments (FR7, FR9, FR11, NFR1, NFR5, NFR9). | Planned (`mobile/src/screens/DashboardScreen.tsx`) |
| Record Delivery Screen | Fast-entry form for recording incoming stock from suppliers in cases and loose bottles; automatically calculates total bottles, saves to local SQLite with a UUID, and queues for backend synchronization (FR4, FR7, FR9, FR10, NFR1, NFR5, NFR9, NFR12). | Planned (`mobile/src/screens/DeliveryScreen.tsx`) |
| Record Release Screen | Form for recording stock released to customers in cases and bottles; validates against available inventory in real time, rejects releases exceeding stock with an alert dialog, and logs the transaction with a UUID (FR5, FR7, FR8, FR9, FR10, NFR1, NFR5, NFR9). | Planned (`mobile/src/screens/ReleaseScreen.tsx`) |
| Stock Adjustment Screen | Form to record inventory changes due to breakage, damage, loss, or count corrections in cases and bottles; requires a mandatory reason and saves an immutable adjustment record with a UUID (FR6, FR7, FR9, FR10, NFR1, NFR5, NFR9, NFR12). | Planned (`mobile/src/screens/AdjustmentScreen.tsx`) |
| Product Catalog Screen | Searchable and filterable list of all soft drink products showing current stock (cases and remaining bottles), bottle size, bottles per case, reorder level, and active/inactive status (FR3, FR7, FR9, FR17, NFR1). | Planned (`mobile/src/screens/ProductListScreen.tsx`) |
| Product Management Screen | Owner-only form to add, edit, or deactivate products, configure brand names, bottle sizes, bottles per case (pack size), and set individual product reorder thresholds (FR3, FR17, NFR7). | Planned (`mobile/src/screens/ProductFormScreen.tsx`) |
| Transaction History Screen | Read-only, immutable audit trail of all transactions (deliveries, releases, adjustments) with filters by date, type, product, and staff; displays transaction UUID, user, device ID, and timestamp (FR15, NFR1, NFR2, NFR12). | Planned (`mobile/src/screens/TransactionHistoryScreen.tsx`) |
| Sync Queue & Status Screen | Displays network connectivity status, pending/synced/failed transaction counts, detailed failure reasons with retry triggers, and a manual sync button to push offline SQLite records to MongoDB Atlas (FR10, FR11, FR14, NFR2, NFR3, NFR4, NFR6). | Planned (`mobile/src/screens/SyncQueueScreen.tsx`) |
| Reports & Analytics Screen | Generates reports for current stock levels, stock movement logs filtered by date range, and a replenishment list of items that have reached or fallen below their reorder level (FR16, FR17, NFR1). | Planned (`mobile/src/screens/ReportsScreen.tsx`) |
| User Management Screen | Owner-only screen to view, search, and deactivate existing accounts, as well as navigate to the staff enrollment screen (FR1, FR2, FR17, NFR7). | Planned (`mobile/src/screens/UserManagementScreen.tsx`) |
| Staff Enrollment Screen | Owner-only screen/form to enroll and register a newly hired staff member or manager into the business; captures full name, username, initial temporary password, and role assignment (`staff` or `owner/manager`) (FR1, FR2, FR17, NFR7). | Planned (`mobile/src/screens/StaffEnrollmentScreen.tsx`) |
| Settings / Profile Screen | Displays logged-in user profile, role, device ID, local database diagnostics, sync preferences, and provides a secure logout function (FR2, NFR7, NFR8, NFR12). | Planned (`mobile/src/screens/SettingsScreen.tsx`) |

## Data Handling Rules

- Stock is stored in bottles: `total_bottles = (cases x units_per_case) + loose bottles`. It is displayed as cases and remaining bottles.
- Every transaction gets a UUID on the device when it is created, so a retried upload is never counted twice.
- Records are never deleted or edited. Corrections are entered as new adjustment transactions.

## Role-Based Access Control (RBAC) Table

The system defines two primary roles: **Staff** and **Owner / Manager** (FR2, NFR7). Access to screens and operational capabilities is strictly partitioned according to these roles:

| Module / Screen | Feature / Permission | Staff | Owner / Manager | Reference |
|---|---|:---:|:---:|---|
| **Authentication & Profile** | Log in with credentials and role | ✅ | ✅ | FR2, Login Screen |
| | View profile, device ID, and diagnostics | ✅ | ✅ | Settings Screen |
| **Dashboard & Catalog** | View dashboard summary & stock alerts | ✅ | ✅ | FR7, FR9, Dashboard Screen |
| | Browse searchable product catalog & pack sizes | ✅ | ✅ | Product Catalog Screen |
| **Inventory Transactions** | Record deliveries from suppliers (cases & bottles) | ✅ | ✅ | FR4, Delivery Screen |
| | Record releases to customers with real-time stock check | ✅ | ✅ | FR5, FR8, Release Screen |
| | Record stock adjustments with required reason | ✅ | ✅ | FR6, Adjustment Screen |
| **Sync & Offline Queue** | View sync queue status (pending / synced / failed) | ✅ | ✅ | FR10, FR14, Sync Queue Screen |
| | Trigger manual sync of offline transactions | ✅ | ✅ | FR11, FR14, Sync Queue Screen |
| **Audit & History** | View immutable transaction history & audit logs | ✅ | ✅ | FR15, Transaction History Screen |
| **Reports & Analytics** | View current stock level & movement reports by date | ❌ | ✅ | FR16, Reports Screen |
| | View replenishment lists for low-stock items | ❌ | ✅ | FR16, FR17, Reports Screen |
| **Product Management** | Add, edit, and deactivate products | ❌ | ✅ | FR3, Product Management Screen |
| | Configure brand, bottle size, and pack size (bottles/case) | ❌ | ✅ | FR3, Product Management Screen |
| | Set and update reorder thresholds per product | ❌ | ✅ | FR17, Product Management Screen |
| **User Administration** | Predefine initial users and credentials via `.env` file | ❌ | ✅ | FR1, Environment Config |
| | Enroll newly hired staff/managers into the business | ❌ | ✅ | FR17, Staff Enrollment Screen |
| | Create, edit, and deactivate staff & manager accounts | ❌ | ✅ | FR17, User Management Screen |
| | Assign roles and manage access permissions | ❌ | ✅ | FR2, FR17, User Management Screen |
