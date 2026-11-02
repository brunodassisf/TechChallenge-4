import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { listPosts } from '@/api/posts';
import type { Post } from '@/api/types';
import { createLatest } from '@/lib/latest';

type Status = 'loading' | 'success' | 'error';

export function usePosts(query: string) {
  const [latest] = useState(createLatest);
  const [status, setStatus] = useState<Status>('loading');
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(
    (opts?: { pull?: boolean }) => {
      if (opts?.pull) setRefreshing(true);
      else setStatus((s) => (s === 'success' ? s : 'loading'));
      latest(listPosts(query))
        .then(({ stale, value }) => {
          if (stale) return;
          setPosts(value);
          setError(null);
          setStatus('success');
        })
        .catch((err: unknown) => {
          setError(err instanceof ApiError ? err.message : 'Algo deu errado.');
          setStatus('error');
        })
        .finally(() => setRefreshing(false));
    },
    [latest, query],
  );

  return { status, posts, error, refreshing, reload };
}
