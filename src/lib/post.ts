import type { Post, SessionUser } from '@/api/types';

export function authorName(post: Pick<Post, 'authors'>): string {
  const name = post.authors?.name?.trim();
  return name ? name : 'Autor desconhecido';
}

export function canCreatePost(user: SessionUser | null): boolean {
  return user?.role === 'AUTHOR' || user?.role === 'ADMIN';
}

export function canManagePost(user: SessionUser | null, post: Pick<Post, 'authorId'>): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.authorId !== null && user.authorId === post.authorId;
}
