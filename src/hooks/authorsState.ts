import type { AuthorSummary } from '@/api/types';

export type AuthorsState = {
  status: 'loading' | 'success' | 'error';
  authors: AuthorSummary[];
  error: string | null;
  refreshing: boolean;
};

export type AuthorsAction =
  | { type: 'request'; pull: boolean }
  | { type: 'success'; authors: AuthorSummary[] }
  | { type: 'failure'; message: string };

export const initialAuthorsState: AuthorsState = { status: 'loading', authors: [], error: null, refreshing: false };

export function authorsReducer(state: AuthorsState, action: AuthorsAction): AuthorsState {
  switch (action.type) {
    case 'request':
      return action.pull ? { ...state, refreshing: true } : { ...state, status: 'loading' };
    case 'success':
      return { status: 'success', authors: action.authors, error: null, refreshing: false };
    case 'failure':
      return { ...state, status: 'error', error: action.message, refreshing: false };
  }
}
