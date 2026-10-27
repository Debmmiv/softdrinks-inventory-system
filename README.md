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

## Data Handling Rules

- Stock is stored in bottles: `total_bottles = (cases x units_per_case) + loose bottles`. It is displayed as cases and remaining bottles.
- Every transaction gets a UUID on the device when it is created, so a retried upload is never counted twice.
- Records are never deleted or edited. Corrections are entered as new adjustment transactions.






## Project Structure

```
softdrinks-inventory-system/
├── README.md
├── .gitignore
├── backend/    (Node.js + Express API)
└── mobile/     (Expo + React Native app)
```

## Backend Setup

1. Go to the backend folder and install the packages:
   ```bash
   cd backend
   npm install
   ```
2. Create a file named `.env` inside `backend/` (never commit this file):
   ```dotenv
   MONGODB_URI=mongodb+srv://<db_username>:<db_password>@<cluster-address>/inventory?appName=Cluster0
   PORT=3000
   JWT_SECRET=<your-own-long-random-string>
   ```
   Get the connection string from MongoDB Atlas: **Connect**, then **Drivers**.
3. Allow your IP address in Atlas under **Network Access**.
4. Start the server:
   ```bash
   node index.js
   ```
   You should see `API running` and `MongoDB connected`.
5. Check it works: open `http://localhost:3000/health` and look for `{"ok":true}`.

**Troubleshooting**

| Error | Fix |
|---|---|
| `injected env (0)` or `uri ... undefined` | `.env` is empty, unsaved, or in the wrong folder |
| `querySrv ECONNREFUSED` | Your network blocks DNS lookups. Keep the `dns.setServers` line at the top of `index.js` |
| `bad auth` | Wrong database username or password in `.env` |

## Progress Log

| Date | Update | By |
|---|---|---|
| Oct 26, 2026 | Added project structure and `.gitignore` | Member |
| Oct 26, 2026 | Set up Express backend with a `/health` check | Member |
| Oct 26, 2026 | Connected backend to MongoDB Atlas | Member |

### Status

- [x] Repository and folder structure
- [x] Backend server running
- [x] MongoDB Atlas connected
- [ ] Mongoose models (products, inventory, transactions, users)
- [ ] Authentication (login and roles)
- [ ] Sync endpoint (`POST /sync`) with validation and duplicate prevention
- [ ] Mobile app setup (Expo, SQLite)
- [ ] Offline recording screens
- [ ] Sync service in the mobile app
- [ ] Reports
- [ ] Testing
