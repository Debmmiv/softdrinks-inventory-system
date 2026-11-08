import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, API_BASE_URL, SYNC_TIMEOUT_MS } from '../utils/constants';

/**
 * Global HTTP Axios Client
 * - Targets EXPO_PUBLIC_API_URL
 * - Automatically attaches Bearer token from SecureStore to outgoing requests
 * - Enforces timeout limits
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: SYNC_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.SESSION_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[apiClient] Failed to read session token from SecureStore:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
