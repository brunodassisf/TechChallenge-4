import type { Comment, Post, SessionUser } from '@/api/types';

/** A API só aceita comentário de estudante. Sessão antiga sem studentId precisa logar de novo. */
export function canComment(user: SessionUser | null): boolean {
  return user?.role === 'STUDENT' && !!user.studentId;
}

/** Estudante com sessão salva antes dos comentários: o app pede para entrar de novo. */
export function needsRelogin(user: SessionUser | null): boolean {
  return user?.role === 'STUDENT' && !user.studentId;
}

export function canEditComment(user: SessionUser | null, comment: Pick<Comment, 'studentId'>): boolean {
  return !!user?.studentId && user.studentId === comment.studentId;
}

/** Excluem: o dono, o admin e o professor dono do post. */
export function canDeleteComment(
  user: SessionUser | null,
  comment: Pick<Comment, 'studentId'>,
  post: Pick<Post, 'authorId'>,
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN' || canEditComment(user, comment)) return true;
  return user.authorId !== null && user.authorId === post.authorId;
}
