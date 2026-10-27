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
| FR1 | The system shall let authorized users log in with their own account and role (staff or owner/manager). |
| FR2 | The system shall let the owner add, edit, and deactivate products, including brand, bottle size, and bottles per case. |
| FR3 | The system shall record deliveries from suppliers in cases and individual bottles. |
| FR4 | The system shall record product releases to customers in cases and individual bottles. |
| FR5 | The system shall record stock adjustments (breakage, loss, count correction) with a reason. |
| FR6 | The system shall automatically convert cases and bottles into total bottles using the product's case-pack size, and display stock as cases and remaining bottles. |
| FR7 | The system shall reject a release that exceeds the available stock and show an alert. |
| FR8 | The system shall store all products, stock, and transactions in a local SQLite database so users can view and update records without internet. |
| FR9 | The system shall assign a unique ID (UUID) to each transaction and place it in a sync queue with a `PENDING` status. |
| FR10 | The system shall detect internet connectivity and send pending transactions to the backend automatically. |
| FR11 | The backend shall validate each transaction, check for duplicate IDs, and reject duplicates. |
| FR12 | The backend shall store validated transactions and update the central stock records in MongoDB Atlas. |
| FR13 | The system shall mark transactions as `SYNCED` after confirmation, or `FAILED` with a reason, and retry failed submissions. |
| FR14 | The system shall keep a complete transaction history that cannot be deleted or edited. |
| FR15 | The system shall generate reports for current stock levels, stock movements by date, and products that need replenishment. |
| FR16 | The system shall let the owner manage user accounts and set the reorder level for each product. |

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
| Login Screen | Allows staff and owner/manager to log in using their credentials and role; authenticates locally/remotely and enforces role-based navigation and permissions (FR1, NFR7). | Planned (`mobile/src/screens/LoginScreen.js`) |
| Dashboard / Home Screen | Displays current inventory summary (cases and loose bottles), device network/sync status indicator, low-stock replenishment alerts, and quick-action shortcuts for recording deliveries, releases, and adjustments (FR6, FR8, FR10, NFR1, NFR5, NFR9). | Planned (`mobile/src/screens/DashboardScreen.js`) |
| Record Delivery Screen | Fast-entry form for recording incoming stock from suppliers in cases and loose bottles; automatically calculates total bottles, saves to local SQLite with a UUID, and queues for backend synchronization (FR3, FR6, FR8, FR9, NFR1, NFR5, NFR9, NFR12). | Planned (`mobile/src/screens/DeliveryScreen.js`) |
| Record Release Screen | Form for recording stock released to customers in cases and bottles; validates against available inventory in real time, rejects releases exceeding stock with an alert dialog, and logs the transaction with a UUID (FR4, FR6, FR7, FR8, FR9, NFR1, NFR5, NFR9). | Planned (`mobile/src/screens/ReleaseScreen.js`) |
| Stock Adjustment Screen | Form to record inventory changes due to breakage, damage, loss, or count corrections in cases and bottles; requires a mandatory reason and saves an immutable adjustment record with a UUID (FR5, FR6, FR8, FR9, NFR1, NFR5, NFR9, NFR12). | Planned (`mobile/src/screens/AdjustmentScreen.js`) |
| Product Catalog Screen | Searchable and filterable list of all soft drink products showing current stock (cases and remaining bottles), bottle size, bottles per case, reorder level, and active/inactive status (FR2, FR6, FR8, FR16, NFR1). | Planned (`mobile/src/screens/ProductListScreen.js`) |
| Product Management Screen | Owner-only form to add, edit, or deactivate products, configure brand names, bottle sizes, bottles per case (pack size), and set individual product reorder thresholds (FR2, FR16, NFR7). | Planned (`mobile/src/screens/ProductFormScreen.js`) |
| Transaction History Screen | Read-only, immutable audit trail of all transactions (deliveries, releases, adjustments) with filters by date, type, product, and staff; displays transaction UUID, user, device ID, and timestamp (FR14, NFR1, NFR2, NFR12). | Planned (`mobile/src/screens/TransactionHistoryScreen.js`) |
| Sync Queue & Status Screen | Displays network connectivity status, pending/synced/failed transaction counts, detailed failure reasons with retry triggers, and a manual sync button to push offline SQLite records to MongoDB Atlas (FR9, FR10, FR13, NFR2, NFR3, NFR4, NFR6). | Planned (`mobile/src/screens/SyncQueueScreen.js`) |
| Reports & Analytics Screen | Generates reports for current stock levels, stock movement logs filtered by date range, and a replenishment list of items that have reached or fallen below their reorder level (FR15, FR16, NFR1). | Planned (`mobile/src/screens/ReportsScreen.js`) |
| User Management Screen | Owner-only screen to view, create, edit, and deactivate staff and manager accounts, assign roles, and manage access permissions (FR1, FR16, NFR7). | Planned (`mobile/src/screens/UserManagementScreen.js`) |
| Settings / Profile Screen | Displays logged-in user profile, role, device ID, local database diagnostics, sync preferences, and provides a secure logout function (FR1, NFR7, NFR8, NFR12). | Planned (`mobile/src/screens/SettingsScreen.js`) |

## Data Handling Rules

- Stock is stored in bottles: `total_bottles = (cases x units_per_case) + loose bottles`. It is displayed as cases and remaining bottles.
- Every transaction gets a UUID on the device when it is created, so a retried upload is never counted twice.
- Records are never deleted or edited. Corrections are entered as new adjustment transactions.

