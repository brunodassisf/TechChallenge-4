import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { login } from '@/api/auth';
import type { SessionUser } from '@/api/types';
import { parseStoredSession, type Session } from './session';
import { clearRaw, loadRaw, saveRaw } from './tokenStorage';

type AuthValue = {
  ready: boolean;
  session: Session | null;
  user: SessionUser | null;
  token: string | null;
  signIn(email: string, password: string): Promise<SessionUser>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let alive = true;
    loadRaw()
      .catch(() => null)
      .then((raw) => {
        if (!alive) return;
        const parsed = parseStoredSession(raw);
        setSession(parsed);
        if (raw && !parsed) clearRaw().catch(() => {});
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await login(email, password);
    const next: Session = { token: res.token, expiresAt: res.expiresAt, user: res.user };
    setSession(next);
    await saveRaw(JSON.stringify(next)).catch(() => {});
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    await clearRaw().catch(() => {});
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      token: session?.token ?? null,
      signIn,
      signOut,
    }),
    [ready, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
