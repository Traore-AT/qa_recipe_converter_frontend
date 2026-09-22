/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import client from '../api/client';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; first_name?: string; last_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await client.get('/csrf/');
      } catch {
        // CSRF cookie may already be set; continue anyway
      }
      try {
        const r = await authApi.me();
        setUser(r.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshCsrf = async () => {
    try {
      await client.get('/csrf/');
    } catch {
      // CSRF cookie may already be set; continue anyway
    }
  };

  const login = async (username: string, password: string) => {
    const r = await authApi.login(username, password);
    setUser(r.data);
    await refreshCsrf();
  };

  const register = async (data: { username: string; email: string; password: string; first_name?: string; last_name?: string }) => {
    const r = await authApi.register(data);
    setUser(r.data);
    await refreshCsrf();
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    await refreshCsrf();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
