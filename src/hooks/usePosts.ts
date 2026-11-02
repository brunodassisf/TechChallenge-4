import { useCallback, useReducer, useState } from 'react';

import { ApiError } from '@/api/client';
import { listPosts } from '@/api/posts';
import { createLatest } from '@/lib/latest';
import { initialPostsState, postsReducer } from './postsState';

export function usePosts(query: string) {
  const [latest] = useState(createLatest);
  const [state, dispatch] = useReducer(postsReducer, initialPostsState);

  const reload = useCallback(
    (opts?: { pull?: boolean }) => {
      dispatch({ type: 'request', pull: !!opts?.pull });
      latest(listPosts(query))
        .then((res) => {
          if (res.stale) return;
          dispatch({ type: 'success', query, posts: res.value });
        })
        .catch((err: unknown) => {
          dispatch({ type: 'failure', message: err instanceof ApiError ? err.message : 'Algo deu errado.' });
        });
    },
    [latest, query],
  );

  return { ...state, reload };
}
