import { createContext, ReactNode, useContext, useState } from 'react';
import { api, setToken } from '../api/client';

type User = { id: string; username: string; role: 'staff' | 'owner' };

type AuthValue = {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  async function login(username: string, password: string) {
    const data = await api<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    setUser(data.user);
    // TODO: store the token with expo-secure-store and cache the user in SQLite for offline login.
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
