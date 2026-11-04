import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { User, Role } from '../types/user';
import { STORAGE_KEYS, TABLES } from '../utils/constants';
import { getDatabase } from '../database/db';

// ---- Types ----------------------------------------------------------------

interface AuthContextValue {
  user: User | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  /**
   * Phase 1: Checks users_cache in SQLite (bcrypt compare).
   * Falls back to mock users when cache is empty (dev convenience).
   * Phase 2: Will hit POST /api/auth/login first when online.
   */
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

// ---- Mock users for Phase 1 development -----------------------------------
// These are replaced by real accounts from MongoDB in Phase 2.
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: 'mock-owner-001',
    username: 'owner',
    password: 'owner123',
    full_name: 'Store Owner',
    role: 'owner/manager',
    is_active: true,
  },
  {
    id: 'mock-staff-001',
    username: 'staff',
    password: 'staff123',
    full_name: 'Juan Dela Cruz',
    role: 'staff',
    is_active: true,
  },
];

// ---- Context ---------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Initialise device ID on first provider mount (NFR12)
  React.useEffect(() => {
    initDeviceId();
  }, []);

  async function initDeviceId() {
    let id = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = Crypto.randomUUID();
      await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, id);
    }
    setDeviceId(id);
  }

  const login = useCallback(
    async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        // Phase 1: Try mock users first (no backend yet)
        const mock = MOCK_USERS.find(
          (u) => u.username === username && u.password === password && u.is_active
        );
        if (mock) {
          const { password: _, ...safeUser } = mock;
          setUser(safeUser);
          return { success: true };
        }

        // Try SQLite users_cache (populated after first real online login in Phase 2)
        const db = await getDatabase();
        const cached = await db.getFirstAsync<{
          id: string; username: string; password_hash: string;
          full_name: string; role: string; is_active: number;
        }>(
          `SELECT * FROM ${TABLES.USERS_CACHE} WHERE username = ? AND is_active = 1`,
          [username]
        );

        if (!cached) {
          return { success: false, error: 'Invalid username or password.' };
        }

        // In Phase 2 we will verify bcrypt hash. For now direct compare with hash.
        // This path is used when the user has previously logged in online.
        const { compare } = await import('bcryptjs');
        const valid = await compare(password, cached.password_hash);
        if (!valid) {
          return { success: false, error: 'Invalid username or password.' };
        }

        setUser({
          id: cached.id,
          username: cached.username,
          full_name: cached.full_name,
          role: cached.role as Role,
          is_active: cached.is_active === 1,
        });
        return { success: true };
      } catch (err) {
        console.error('[AuthContext] login error', err);
        return { success: false, error: 'An unexpected error occurred. Please try again.' };
      }
    },
    []
  );

  // FR5: Clears session within 500ms — just in-memory state plus SecureStore token
  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_TOKEN);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, deviceId, isAuthenticated: user !== null, login, logout }}
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
