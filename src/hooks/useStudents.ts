import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { listStudents } from '@/api/students';
import type { StudentSummary } from '@/api/types';
import { createLatest } from '@/lib/latest';
import { useHandleApiError, useRequireToken } from './useAuthGuard';

type Status = 'loading' | 'success' | 'error';

export function useStudents() {
  const [latest] = useState(createLatest);
  const requireToken = useRequireToken();
  const handleApiError = useHandleApiError();
  const [status, setStatus] = useState<Status>('loading');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(
    (opts?: { pull?: boolean }) => {
      const token = requireToken();
      if (!token) return;
      if (opts?.pull) setRefreshing(true);
      else setStatus('loading');
      latest(listStudents(token))
        .then((res) => {
          if (res.stale) return;
          setStudents(res.value);
          setError(null);
          setStatus('success');
        })
        .catch((err: unknown) => {
          if (handleApiError(err)) return;
          setError(err instanceof ApiError ? err.message : 'Algo deu errado.');
          setStatus('error');
        })
        .finally(() => setRefreshing(false));
    },
    [latest, requireToken, handleApiError],
  );

  return { status, students, error, refreshing, reload };
}
