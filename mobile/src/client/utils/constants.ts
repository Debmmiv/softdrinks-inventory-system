import Constants from 'expo-constants';
import { Platform } from 'react-native';

// AsyncStorage / SecureStore keys
export const STORAGE_KEYS = {
  SESSION_TOKEN: 'session_token', // JWT token from server
  DEVICE_ID: 'device_id', // Permanent per-device UUID (NFR12)
  LOGGED_IN_USER_ID: 'logged_in_user_id',
} as const;

// SQLite table names — single source of truth, never hardcode strings in repos
export const TABLES = {
  USERS_CACHE: 'users_cache',
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  SYNC_QUEUE: 'sync_queue',
} as const;

/**
 * Dynamically resolves the API base URL depending on runtime environment:
 * - On Web: uses localhost:8081 or EXPO_PUBLIC_API_URL
 * - On Physical Phone (Expo Go): extracts host IP from Expo's hostUri (e.g. 192.168.1.41)
 * - On Android Emulator: maps 10.0.2.2 to host machine loopback
 */
function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (Platform.OS === 'web') {
    return envUrl || 'http://localhost:8081/api';
  }

  // If env URL is explicitly pointing to an IP address (not localhost), use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // On physical phone running Expo Go, read host machine IP from Metro bundle connection
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8081/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8081/api';
  }

  return envUrl || 'http://192.168.1.41:8081/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

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
