import type { Post, SessionUser } from '@/api/types';

export function authorName(post: Pick<Post, 'authors'>): string {
  const name = post.authors?.name?.trim();
  return name ? name : 'Autor desconhecido';
}

/** A API só aceita criar post de quem tem perfil de Author (admin sem perfil recebe 403). */
export function canCreatePost(user: SessionUser | null): boolean {
  return !!user?.authorId;
}

/** Pode abrir a tela de edição; o dono de cada post é conferido nela. */
export function canEditPosts(user: SessionUser | null): boolean {
  return user?.role === 'ADMIN' || !!user?.authorId;
}

export function canManagePost(user: SessionUser | null, post: Pick<Post, 'authorId'>): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.authorId !== null && user.authorId === post.authorId;
}
