import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { hashPasswordLocally, comparePasswordLocally } from '../utils/crypto';
import type { User, Role } from '../types/user';
import { STORAGE_KEYS, TABLES } from '../utils/constants';
import { getDatabase } from '../database/db';
import { loginApi } from '../api/syncApi';
import { networkService } from '../services/networkService';
import { syncEngine } from '../services/syncEngine';

// ---- Types ----------------------------------------------------------------

interface AuthContextValue {
  user: User | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

// ---- Context ---------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    let id = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = Crypto.randomUUID();
      await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, id);
    }
    setDeviceId(id);

    try {
      const savedUserId = await SecureStore.getItemAsync(STORAGE_KEYS.LOGGED_IN_USER_ID);
      if (savedUserId) {
        const db = await getDatabase();
        const cached = await db.getFirstAsync<{
          id: string;
          username: string;
          full_name: string;
          role: string;
          is_active: number;
        }>(
          `SELECT id, username, full_name, role, is_active FROM ${TABLES.USERS_CACHE} WHERE id = ? AND is_active = 1`,
          [savedUserId]
        );
        if (cached) {
          setUser({
            id: cached.id,
            username: cached.username,
            full_name: cached.full_name,
            role: cached.role as Role,
            is_active: cached.is_active === 1,
          });
        }
      }
    } catch (err) {
      console.warn('[AuthProvider] Failed to restore session:', err);
    }
  }

  const login = useCallback(
    async (rawUsername: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const username = rawUsername.trim().toLowerCase();
      if (!username || !password) {
        return { success: false, error: 'Username and password are required.' };
      }

      const isOnline = await networkService.checkOnlineAsync();
      let serverError: string | null = null;

      // 1. Online Login Attempt (FR2)
      if (isOnline) {
        try {
          const res = await loginApi(username, password);
          const { token, user: apiUser } = res;

          // Store session token and user ID in SecureStore
          await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_TOKEN, token);
          await SecureStore.setItemAsync(STORAGE_KEYS.LOGGED_IN_USER_ID, apiUser.id);

          // Hash password and cache user credentials locally for offline authentication (FR3)
          const passwordHash = await hashPasswordLocally(password);

          const db = await getDatabase();
          await db.runAsync(
            `INSERT INTO ${TABLES.USERS_CACHE} (id, username, password_hash, full_name, role, is_active)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               username = excluded.username,
               password_hash = excluded.password_hash,
               full_name = excluded.full_name,
               role = excluded.role,
               is_active = excluded.is_active;`,
            [apiUser.id, apiUser.username, passwordHash, apiUser.full_name, apiUser.role, apiUser.is_active ? 1 : 0]
          );

          setUser(apiUser);

          // Trigger downstream sync asynchronously to pull catalog updates
          syncEngine.syncDownstream().catch(console.warn);

          return { success: true };
        } catch (err: any) {
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            return {
              success: false,
              error: err.response.data?.error || 'Invalid username or password.',
            };
          }
          serverError =
            err?.response?.data?.details ||
            err?.response?.data?.error ||
            err?.message ||
            'Could not reach authentication server.';
          console.warn('[AuthContext] Cloud login failed, checking local cache:', serverError);
        }
      }

      // 2. Offline / Local Fallback Login (FR3)
      try {
        const db = await getDatabase();
        const cached = await db.getFirstAsync<{
          id: string;
          username: string;
          password_hash: string;
          full_name: string;
          role: string;
          is_active: number;
        }>(
          `SELECT * FROM ${TABLES.USERS_CACHE} WHERE LOWER(username) = LOWER(?) AND is_active = 1`,
          [username]
        );

        if (cached) {
          const valid = await comparePasswordLocally(password, cached.password_hash);
          if (valid) {
            const cachedUser: User = {
              id: cached.id,
              username: cached.username,
              full_name: cached.full_name,
              role: cached.role as Role,
              is_active: cached.is_active === 1,
            };
            await SecureStore.setItemAsync(STORAGE_KEYS.LOGGED_IN_USER_ID, cached.id);
            setUser(cachedUser);
            return { success: true };
          }
          return { success: false, error: 'Invalid username or password.' };
        }

        if (serverError) {
          return {
            success: false,
            error: `Server connection issue: ${serverError}`,
          };
        }

        return {
          success: false,
          error: isOnline
            ? 'Account not found. Please verify your username.'
            : 'Device is offline and no local credentials found. Please log in online once first.',
        };
      } catch (err) {
        console.error('[AuthContext] Offline login error:', err);
        return { success: false, error: 'An unexpected error occurred. Please try again.' };
      }
    },
    []
  );

  // FR5: Clears session within 500ms — in-memory state + SecureStore tokens
  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.LOGGED_IN_USER_ID);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        deviceId,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
