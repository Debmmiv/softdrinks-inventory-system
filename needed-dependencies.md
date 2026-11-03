# Needed Dependencies & Setup Guide

This guide contains the complete setup instructions and required dependencies for the **Full-Stack Offline-First Soft Drinks Inventory System** built with **Expo Router**, **Expo API Routes**, **SQLite**, and **MongoDB Atlas** (TypeScript).

---

## 1. Prerequisites

Before installing, ensure the following are installed on your machine:

- **Node.js**: `v18.x` or `v20.x` (LTS recommended) — [Download Node.js](https://nodejs.org/)
- **Git**: Installed and configured
- **Expo Go App**: Install from Google Play Store on your Android phone, or set up an **Android Studio Emulator** (Android 10+ / API 29+).
- **MongoDB Atlas Cluster**: Connection string URI ready.

---

## 2. Full-Stack Mobile Setup (Inside `mobile/`)

All dependencies—both for the mobile client and the Expo Router backend API routes—are installed inside the `mobile/` directory.

### Quick Install (All-in-One Command)

From the project root, navigate to `mobile/` and run:

```bash
cd mobile

# 1. Install Expo Router and Expo Native Modules
npx expo install expo-router expo-sqlite @react-native-community/netinfo expo-crypto expo-secure-store react-native-screens react-native-safe-area-context expo-constants expo-linking @expo/vector-icons

# 2. Install Server & Backend Packages (for API Routes and CLI seed script)
npm install mongoose jsonwebtoken bcryptjs dotenv axios

# 3. Install Development & TypeScript Typings
npm install -D @types/jsonwebtoken @types/bcryptjs tsx
```

---

## 3. Categorized Dependency Breakdown

### 1. Navigation & Full-Stack Routing
*Fulfills: **FR1**, **FR4**, **NFR7**, **NFR9**, **NFR10** (Screen routing, RBAC tabs, API endpoints).*

```bash
npx expo install expo-router expo-constants expo-linking react-native-screens react-native-safe-area-context
```
- `expo-router`: File-based routing for both mobile client screens (`src/app/(tabs)/...`) and backend API endpoints (`src/app/api/.../*+api.ts`).
- `react-native-screens` & `react-native-safe-area-context`: Screen lifecycle optimization and edge-to-edge layout management.
- `expo-constants` & `expo-linking`: Essential utilities for routing and environment configuration.

### 2. Local Database & Offline Storage
*Fulfills: **FR8** (Local SQLite storage), **NFR1** (Offline availability), **NFR2** (Data reliability), **NFR5** (Sub-500ms local save).*

```bash
npx expo install expo-sqlite
```
- `expo-sqlite`: Embedded SQLite database for local offline product catalogs, pending transactions, and sync queues with WAL support.

### 3. Network State Detection
*Fulfills: **FR18** (Automatic network restoration detection for sync).*

```bash
npx expo install @react-native-community/netinfo
```
- `@react-native-community/netinfo`: Monitors device internet connection in real time to trigger automatic sync upon network recovery.

### 4. Cryptography, UUID & Secure Storage
*Fulfills: **FR17** (Unique transaction UUIDv4), **NFR3** (Duplicate prevention), **NFR7** (Secure credentials), **NFR12** (Audit logging).*

```bash
npx expo install expo-crypto expo-secure-store
```
- `expo-crypto`: Generates cryptographically secure RFC4122 UUIDv4 identifiers for offline transactions.
- `expo-secure-store`: Encrypted key-value storage for user authentication tokens and device IDs.

### 5. Backend Server & Database Modules (API Routes)
*Fulfills: **FR1**, **FR2**, **FR20**, **FR21**, **NFR3**, **NFR7**, **NFR8** (Central DB, idempotency, auth).*

```bash
npm install mongoose jsonwebtoken bcryptjs dotenv
npm install -D @types/jsonwebtoken @types/bcryptjs tsx
```
- `mongoose`: MongoDB object modeling and connection management for MongoDB Atlas.
- `jsonwebtoken`: Issues and verifies signed JWT tokens for role authorization.
- `bcryptjs`: Salted password hashing (10+ rounds) for owner and staff accounts.
- `dotenv`: Loads local `.env` configuration during development and CLI scripts.
- `tsx`: Fast TypeScript executor used to run the CLI admin bootstrapping script (`npm run seed:admin`).

### 6. Client HTTP Communication & UI Icons
*Fulfills: **FR18**, **FR19**, **FR31**, **NFR9**.*

```bash
npm install axios
npx expo install @expo/vector-icons
```
- `axios`: Client HTTP library for making requests to Expo API routes (`/api/sync/batch`, etc.).
- `@expo/vector-icons`: Material and Ionicons for bottom navigation, status badges, and action triggers.

---

## 4. Environment Configuration (`mobile/.env`)

Create a `.env` file in the `mobile/` directory:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/softdrinks_db?retryWrites=true&w=majority

# Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Client API Base URL
# Use localhost for web / iOS simulator, or your local machine LAN IP for Android devices:
EXPO_PUBLIC_API_URL=http://localhost:8081/api
# Example for physical Android device on Wi-Fi:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:8081/api
```

---

## 5. How to Run & Verify

### 1. Bootstrap Admin Account (CLI Injection)
Run the one-time admin provisioning script from `mobile/`:
```bash
npm run seed:admin
```
*(Prompts for owner username and password, hashing credentials directly into MongoDB Atlas without exposing them in environment variables).*

### 2. Start the Full-Stack Expo App
```bash
npx expo start
```
- Serves both the client app and the server API routes on port 8081.
- Press **`a`** to open on a connected Android device or emulator.
- Or scan the terminal QR code using **Expo Go** on Android.

---

## 6. Troubleshooting

- **Dependency Mismatch Warning**:
  If Expo warns about package version mismatches:
  ```bash
  npx expo install --fix
  ```
- **Clear Bundler Cache**:
  If you encounter bundle or module resolution errors:
  ```bash
  npx expo start -c
  ```
