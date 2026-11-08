# 🚀 Team Onboarding & Setup Guide

Welcome to the **Soft Drinks Inventory System** team! This guide will take you from cloning the repository to running the mobile app and cloud API on your machine in **under 10 minutes**.

---

## 📋 1. Prerequisites (What You Need Installed)

Before you begin, make sure your computer has the following tools installed:

1. **Node.js**: `v18.x` or `v20.x` LTS — [Download Node.js](https://nodejs.org/)
2. **Git**: Installed and configured — [Download Git](https://git-scm.com/)
3. **Expo Go (on your Android phone)**: Download **Expo Go** from the Google Play Store, OR set up an **Android Studio Emulator** (Android 10+ / API 29+).
4. **Code Editor**: VS Code (recommended).

---

## ⚡ 2. Quickstart (Step-by-Step)

### Step 1: Clone the Repository
Open your terminal (PowerShell, Command Prompt, or Terminal) and run:

```bash
git clone https://github.com/Debmmiv/softdrinks-inventory-system.git
cd softdrinks-inventory-system
```

---

### Step 2: Install Mobile & Server Dependencies
Navigate into the `mobile/` directory where the full-stack Expo application lives:

```bash
cd mobile
npm install --legacy-peer-deps
```

> 💡 **Note on `--legacy-peer-deps`**: We use `--legacy-peer-deps` to smoothly resolve React 19 web dependencies bundled with Expo Router without peer dependency warnings.

---

### Step 3: Configure Your Environment Variables (`.env`)

1. Inside `mobile/`, copy the example file to create your active `.env`:
   - **Windows PowerShell:**
     ```powershell
     Copy-Item .env.example .env
     ```
   - **Mac / Linux / Git Bash:**
     ```bash
     cp .env.example .env
     ```

2. Open `mobile/.env` in your editor. It should look like this:

```env
# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://tiozombay_db_user:XWVxpr3a8JeXTy7@softdrinks-system.tpuqdyy.mongodb.net/softdrinks_db?retryWrites=true&w=majority

# JWT Authentication Secret Key
JWT_SECRET=super_secret_jwt_key_softdrinks_gusa_2026_xyz

# Client API Base URL
EXPO_PUBLIC_API_URL=http://localhost:8081/api
```

> 🔑 **Team Database Note**:
> - You can use the shared team MongoDB Atlas connection string shown above, OR ask the project owner for your specific credentials.
> - **Never commit `.env` to GitHub!** It is already included in `.gitignore` to protect credentials.

---

### Step 4: Verify Your Connection & API Routes

Run our automated verification script to confirm your machine connects to the database:

```bash
npm run test:api
```

You should see:
```text
✓ Health check passed!
✓ Bad password rejected properly!
✓ Products retrieval passed!
✓ Product creation passed!
✓ First sync committed!
✓ Idempotency verified!
✓ Replenishment report verified!

========================================================
  ALL PHASE 2 API ENDPOINTS VERIFIED 100% OPERATIONAL!  
========================================================
```

---

### Step 5: (Optional) Seed Owner & Staff Accounts

If you want to create your own Owner/Manager login account directly in MongoDB Atlas via the CLI:
```bash
npm run seed:admin
```
Follow the interactive prompts to choose a username and password.

To enroll a warehouse staff account from the terminal:
```bash
npm run enroll:staff
```
*(You can also enroll staff directly inside the app under **Settings -> OWNER CONTROLS -> Enroll New Staff Member** once logged in as an Owner).*

---

### Step 6: Start the App!

Start the Expo development server:

```bash
npx expo start
```

Once Metro Bundler starts:
- **On Android Emulator**: Press **`a`** in the terminal.
- **On Web Browser**: Press **`w`** in the terminal.
- **On Physical Android Phone**:
  1. Make sure your phone and computer are connected to the **same Wi-Fi network**.
  2. Open the **Expo Go** app on your phone.
  3. Scan the QR code displayed in the terminal.

> 📱 **Phone Wi-Fi & Dynamic IP Resolution**:
> The app dynamically extracts your PC's Wi-Fi IP address from the Metro connection. If needed, you can explicitly set your LAN IP in `mobile/.env` (e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.41:8081/api`).

---

## 👥 3. How to Log In & Test

When the app opens on your phone/emulator, you will see the Login screen.

### Development Test Credentials:

| Role | Username | Password | Access Rights |
|---|---|---|---|
| **Store Owner** | `zach` *(or your seeded user)* | `ZakLang123` | Full access + Owner controls (Staff enrollment, user status toggle, password resets) |
| **Warehouse Staff** | `staff` *(or your enrolled staff)* | `staff123` | Operational floor: Delivery, Release, Adjustment, Catalog, History, Sync |

### Try The Full Workflow:
1. **Delivery**: Select a drink (e.g. *Coca-Cola Glass Bottle 330ml*), enter cases and loose bottles, and tap **Record Delivery**. Notice stock immediately updates in SQLite.
2. **Release (Guardrail Check)**: Try releasing **more** bottles than are on hand. Notice the app blocks the transaction immediately (FR13 safety guard!).
3. **Outbox & Cloud Sync**: Tap the **Sync** tab. Notice your new transaction is queued as `PENDING`. Tap **Sync Now** to push it to MongoDB Atlas!
4. **Offline Mode Test**: Turn your phone on Airplane Mode and record a delivery or release. Notice it saves in <10ms to local SQLite. Log out and log back in while offline—the phone authenticates locally via the encrypted SQLite cache!
5. **In-App Staff Enrollment**: Go to **Settings -> OWNER CONTROLS -> Enroll New Staff Member**, fill in an employee's name and password, and create their account right from your phone.

---

## 🛠️ 4. Useful Terminal Commands

All commands should be executed from inside `mobile/`:

| Command | What It Does |
|---|---|
| `npx expo start` | Launches development server (client app + server API routes) |
| `npx expo start -c` | Clears Metro bundler cache (run if you see weird cache bugs) |
| `npm run test:api` | Runs automated test suite verifying all MongoDB cloud endpoints |
| `npm run seed:admin` | CLI interactive tool to create a new Owner/Manager account |
| `npm run enroll:staff` | CLI interactive tool to enroll a new Warehouse Staff account |
| `npx tsc --noEmit` | Runs full TypeScript compiler check across client & server |
| `npx expo-doctor` | Runs 20 system health checks on dependencies and configurations |

---

## ❓ 5. Troubleshooting Common Issues

### 1. `Cannot find module ...` or TypeScript errors:
Run `npx tsc --noEmit`. If dependencies are missing, run:
```bash
npm install --legacy-peer-deps
```

### 2. Physical phone can't connect to server (`Network Error`):
1. Ensure both your computer and phone are on the **exact same Wi-Fi network** (not mobile data).
2. Find your computer's IP address:
   - **Windows:** Run `ipconfig` (look for `IPv4 Address`, e.g. `192.168.1.50`).
   - **Mac:** Run `ifconfig` or check System Settings > Wi-Fi.
3. Update `mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.50:8081/api
   ```
4. Restart Expo: `npx expo start -c`.

### 3. MongoDB connection timeout:
1. Ensure you have an active internet connection.
2. If using your own Atlas cluster, verify that `0.0.0.0/0` is added under **Security > Network Access** in your MongoDB Atlas dashboard.

---

Happy coding! If you get stuck, message the team or check [`AI-CONTEXT.md`](file:///D:/softdrinks-app/softdrinks-inventory-system/AI-CONTEXT.md).
