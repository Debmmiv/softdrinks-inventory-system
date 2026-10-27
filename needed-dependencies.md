# Needed Dependencies & Setup Guide

This guide contains the complete setup instructions and required dependencies for the **Soft Drinks Inventory System** mobile app (Expo / React Native with **TypeScript**) and backend.

---

## 1. Prerequisites

Before installing, ensure the following are installed on your machine:

- **Node.js**: `v18.x` or `v20.x` (LTS recommended) — [Download Node.js](https://nodejs.org/)
- **Git**: Installed and configured
- **Expo Go App**: Install from Google Play Store on your Android phone, or set up an **Android Studio Emulator**.

---

## 2. Mobile App Setup (Expo, React Native & TypeScript)

### Step A: Initialize Mobile App with TypeScript (If Not Yet Created)
From the project root (`softdrinks-inventory-system/`):

```bash
# Initialize using the blank TypeScript template
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
```

*(This automatically generates `tsconfig.json`, `App.tsx`, and installs `typescript` and React typings.)*

---

### Step B: Quick Install (All-in-One Command)
Run this single command inside the `mobile/` directory to install all required packages at once:

```bash
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs axios && npx expo install expo-sqlite @react-native-community/netinfo expo-crypto expo-secure-store react-native-screens react-native-safe-area-context @expo/vector-icons
```

---

### Step C: Categorized Dependency Breakdown

If you prefer to install packages step-by-step or need to understand what each package does:

#### 1. Local Database & Offline Storage
*Fulfills: **FR8** (Local SQLite storage), **NFR1** (Offline availability), **NFR2** (Data reliability), **NFR5** (Sub-2s local save).*

```bash
npx expo install expo-sqlite
```
- `expo-sqlite`: Embedded SQLite database for local offline product catalogs, pending transactions, and sync queues.

#### 2. Network State Detection
*Fulfills: **FR10** (Automatic connectivity detection for sync).*

```bash
npx expo install @react-native-community/netinfo
```
- `@react-native-community/netinfo`: Monitors device internet connection in real-time and triggers automatic sync when back online.

#### 3. UUID Generation & Secure Storage
*Fulfills: **FR9** (Unique transaction UUID), **NFR3** (Duplicate prevention), **NFR7** (Secure credentials), **NFR12** (Audit logging).*

```bash
npx expo install expo-crypto expo-secure-store
```
- `expo-crypto`: Generates cryptographically secure RFC4122 UUIDs for each local transaction before syncing.
- `expo-secure-store`: Encrypted key-value storage for user authentication tokens, session data, and device IDs.

#### 4. Navigation & UI Components
*Fulfills: **FR1** (Role-based access), **NFR7** (Screen authorization), **NFR9** (Fast staff workflow), **NFR10** (Android compatibility).*

```bash
# Core navigation packages
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

# Expo-compatible navigation dependencies and icon library
npx expo install react-native-screens react-native-safe-area-context @expo/vector-icons
```
- `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`: Stack and bottom-tab navigation with role gating (Staff vs. Owner/Manager).
- `react-native-screens` & `react-native-safe-area-context`: Native screen performance optimizations and notch/edge safe-area handling.
- `@expo/vector-icons`: Material and Ionicons icons for navigation, status badges, and action buttons.

#### 5. HTTP Client for Synchronization
*Fulfills: **FR11** (Transaction validation), **FR12** (Central database sync), **FR13** (Sync retry), **NFR8** (HTTPS communication).*

```bash
npm install axios
```
- `axios`: Handles REST API requests, batch payload uploads, and timeout/retry interceptors when syncing with the Node.js/Express backend.

---

## 3. Dependency Summary Table

| Package | Type | Version / Tool | Purpose in Project | Related Requirements |
|---|---|---|---|---|
| `expo-sqlite` | Local DB | `npx expo install` | SQLite engine for offline transactions and local inventory | FR8, NFR1, NFR2, NFR5 |
| `@react-native-community/netinfo` | Network | `npx expo install` | Online/offline connection listener to trigger sync | FR10, NFR4 |
| `expo-crypto` | Security/UUID | `npx expo install` | Generates unique UUIDs for transactions to prevent duplicates | FR9, NFR3, NFR12 |
| `expo-secure-store` | Auth/Storage | `npx expo install` | Secure encrypted storage for JWT tokens and credentials | FR1, NFR7, NFR8 |
| `@react-navigation/*` | Navigation | `npm install` | Role-gated routing (Login, Staff Tabs, Owner Tabs) | FR1, NFR7, NFR9 |
| `react-native-screens` | Performance | `npx expo install` | Native screen memory management for Android | NFR10, NFR11 |
| `react-native-safe-area-context` | UI Layout | `npx expo install` | Android status bar and navigation bar padding | NFR10 |
| `@expo/vector-icons` | UI Icons | `npx expo install` | Icons for dashboard, tabs, and sync status badges | NFR9 |
| `axios` | HTTP Client | `npm install` | Pushes pending SQLite transactions to Express backend | FR11, FR12, FR13, NFR8 |

---

## 4. Backend Dependencies Setup

From the project root (`softdrinks-inventory-system/`):

```bash
cd backend
npm install
```

Ensure your `backend/.env` file is configured:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
```

---

## 5. How to Run & Verify

### Running the Backend:
```bash
cd backend
npm run dev # or: node index.js
```

### Running the Mobile App:
```bash
cd mobile
npx expo start
```

- Press **`a`** to open on an Android emulator.
- Or scan the terminal QR code using the **Expo Go** app on a physical Android phone connected to the same Wi-Fi.

---

## 6. Troubleshooting

- **Dependency Mismatch Warning**:
  If Expo warns about package version mismatches, run:
  ```bash
  npx expo install --fix
  ```
- **Clear Bundler Cache**:
  If you encounter bundle or module resolution errors, start Expo with a clean cache:
  ```bash
  npx expo start -c
  ```
