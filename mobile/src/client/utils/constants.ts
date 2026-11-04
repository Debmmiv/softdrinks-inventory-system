// AsyncStorage / SecureStore keys
export const STORAGE_KEYS = {
  SESSION_TOKEN: 'session_token',  // JWT token from server (Phase 2)
  DEVICE_ID: 'device_id',          // Permanent per-device UUID (NFR12)
  LOGGED_IN_USER_ID: 'logged_in_user_id',
} as const;

// SQLite table names — single source of truth, never hardcode strings in repos
export const TABLES = {
  USERS_CACHE: 'users_cache',
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  SYNC_QUEUE: 'sync_queue',
} as const;

// API base URL — EXPO_PUBLIC_ prefix makes it available in the client bundle
// Falls back to localhost for Expo web / Metro bundler during development
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8081/api';

// Adjustment reasons (FR14) — displayed in picker on Adjustment screen
export const ADJUSTMENT_REASONS = [
  { label: 'Breakage', value: 'breakage' },
  { label: 'Damage', value: 'damage' },
  { label: 'Loss', value: 'loss' },
  { label: 'Count Correction', value: 'count_correction' },
] as const;

// Transaction type labels for display
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Delivery',
  RELEASE: 'Release',
  ADJUSTMENT: 'Adjustment',
};

// Sync queue retry limit before giving up and showing permanent error
export const MAX_SYNC_RETRIES = 5;

// How long (ms) to wait for a sync HTTP request before timing out
export const SYNC_TIMEOUT_MS = 15000;
