import { router } from 'expo-router';
import { useCallback } from 'react';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { isExpired } from '@/auth/session';

/** Em 401, sai da conta e abre o login. Devolve true quando tratou o erro. */
export function useHandleApiError() {
  const { signOut } = useAuth();
  return useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiError && err.status === 401) {
        signOut();
        router.push('/login');
        return true;
      }
      return false;
    },
    [signOut],
  );
}

/**
 * Token válido para uma ação autenticada, ou null. Se a sessão venceu enquanto
 * o app estava aberto, sai da conta e abre o login (a API responde 403, não 401,
 * para PUT/DELETE sem sessão, então não dá para depender só do status).
 */
export function useRequireToken() {
  const { session, signOut } = useAuth();
  return useCallback((): string | null => {
    if (session && !isExpired(session)) return session.token;
    if (session) signOut();
    router.push('/login');
    return null;
  }, [session, signOut]);
}
