import { router } from 'expo-router';
import { useCallback } from 'react';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';

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
