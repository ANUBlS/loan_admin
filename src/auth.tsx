import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onUnauthorized, session } from './api/client';
import type { AdminToken, AdminUser, Role } from './api/types';

const LEVEL: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };

interface Ctx {
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<AdminUser>;
  logout: () => void;
  setSession: (t: AdminToken) => void;
  can: (minimum: Role) => boolean;
  expired: boolean;
}

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => (session.token ? session.user : null));
  const [expired, setExpired] = useState(false);

  useEffect(() => onUnauthorized(() => { setUser(null); setExpired(true); }), []);

  // Refresh own account on load (role may have changed).
  useEffect(() => {
    if (!session.token) return;
    api.get<AdminUser>('/auth/me').then((u) => { session.saveUser(u); setUser(u); }).catch(() => {});
  }, []);

  const setSession = useCallback((t: AdminToken) => {
    session.save(t.accessToken, t.admin);
    setUser(t.admin);
    setExpired(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const t = await api.post<AdminToken>('/auth/login', { username, password });
    setSession(t);
    return t.admin;
  }, [setSession]);

  const logout = useCallback(() => { session.clear(); setUser(null); setExpired(false); }, []);
  const can = useCallback((m: Role) => !!user && LEVEL[user.role] >= LEVEL[m], [user]);

  const value = useMemo(() => ({ user, login, logout, setSession, can, expired }), [user, login, logout, setSession, can, expired]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
