import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { firstAccess, login } from '@/api/auth';
import type { FirstAccessInput, LoginResponse, SessionUser } from '@/api/types';
import { parseStoredSession, type Session } from './session';
import { clearRaw, loadRaw, saveRaw } from './tokenStorage';

type AuthValue = {
  ready: boolean;
  session: Session | null;
  user: SessionUser | null;
  token: string | null;
  signIn(email: string, password: string): Promise<SessionUser>;
  completeFirstAccess(input: FirstAccessInput): Promise<SessionUser>;
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

  const saveSession = useCallback(async (res: LoginResponse) => {
    const next: Session = { token: res.token, expiresAt: res.expiresAt, user: res.user };
    setSession(next);
    await saveRaw(JSON.stringify(next)).catch(() => {});
    return res.user;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => saveSession(await login(email, password)),
    [saveSession],
  );

  const completeFirstAccess = useCallback(
    async (input: FirstAccessInput) => saveSession(await firstAccess(input)),
    [saveSession],
  );

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
      completeFirstAccess,
      signOut,
    }),
    [ready, session, signIn, completeFirstAccess, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
