import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { listComments } from '@/api/comments';
import type { Comment } from '@/api/types';

type Status = 'loading' | 'success' | 'error';

export function useComments(postId: string) {
  const [status, setStatus] = useState<Status>('loading');
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<ApiError | null>(null);

  const reload = useCallback(() => {
    setStatus((s) => (s === 'success' ? s : 'loading'));
    listComments(postId)
      .then((list) => {
        setComments(list);
        setError(null);
        setStatus('success');
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err : new ApiError(0, 'Algo deu errado.'));
        setStatus('error');
      });
  }, [postId]);

  return { status, comments, error, reload };
}
