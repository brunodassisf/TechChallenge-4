import type { Post } from '@/api/types';

export type PostsState = {
  status: 'loading' | 'success' | 'error';
  posts: Post[];
  /** Busca a que `posts` pertence (pode ser diferente da que está sendo digitada). */
  resultQuery: string;
  error: string | null;
  refreshing: boolean;
};

export type PostsAction =
  | { type: 'request'; pull: boolean }
  | { type: 'success'; query: string; posts: Post[] }
  | { type: 'failure'; message: string };

export const initialPostsState: PostsState = {
  status: 'loading',
  posts: [],
  resultQuery: '',
  error: null,
  refreshing: false,
};

export function postsReducer(state: PostsState, action: PostsAction): PostsState {
  switch (action.type) {
    case 'request':
      return action.pull ? { ...state, refreshing: true } : { ...state, status: 'loading' };
    case 'success':
      return { status: 'success', posts: action.posts, resultQuery: action.query, error: null, refreshing: false };
    case 'failure':
      return { ...state, status: 'error', error: action.message, refreshing: false };
  }
}
