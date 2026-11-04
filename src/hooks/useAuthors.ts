import { useCallback, useReducer, useState } from 'react';

import { listAuthors } from '@/api/authors';
import { ApiError } from '@/api/client';
import { createLatest } from '@/lib/latest';
import { authorsReducer, initialAuthorsState } from './authorsState';

export function useAuthors() {
  const [latest] = useState(createLatest);
  const [state, dispatch] = useReducer(authorsReducer, initialAuthorsState);

  const reload = useCallback(
    (opts?: { pull?: boolean }) => {
      dispatch({ type: 'request', pull: !!opts?.pull });
      latest(listAuthors())
        .then((res) => {
          if (res.stale) return;
          dispatch({ type: 'success', authors: res.value });
        })
        .catch((err: unknown) => {
          dispatch({ type: 'failure', message: err instanceof ApiError ? err.message : 'Algo deu errado.' });
        });
    },
    [latest],
  );

  return { ...state, reload };
}
