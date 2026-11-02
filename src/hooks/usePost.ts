import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { getPost } from '@/api/posts';
import type { Post } from '@/api/types';

type Status = 'loading' | 'success' | 'error';

export function usePost(id: string) {
  const [status, setStatus] = useState<Status>('loading');
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const reload = useCallback(() => {
    setStatus((s) => (s === 'success' ? s : 'loading'));
    getPost(id)
      .then((p) => {
        setPost(p);
        setError(null);
        setStatus('success');
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err : new ApiError(0, 'Algo deu errado.'));
        setStatus('error');
      });
  }, [id]);

  return { status, post, error, reload };
}
