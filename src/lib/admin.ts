import type { AuthorSummary, SessionUser } from '@/api/types';
import { CATEGORIES } from '@/theme';
import { formatMonthYear } from './formatDate';

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'ADMIN';
}

/** Para onde vai quem acabou de entrar. */
export function homeRouteFor(user: SessionUser | null): '/admin' | '/' {
  return isAdmin(user) ? '/admin' : '/';
}

export function postCountLabel(n: number): string {
  if (n <= 0) return 'Nenhum post';
  return n === 1 ? '1 post' : `${n} posts`;
}

export function teacherCountLabel(n: number): string {
  return n === 1 ? '1 professor cadastrado' : `${n} professores cadastrados`;
}

export function authorSubtitle(a: Pick<AuthorSummary, 'postCount' | 'createdAt'>): string {
  const since = formatMonthYear(a.createdAt);
  const count = postCountLabel(a.postCount);
  return since ? `${count} · desde ${since}` : count;
}

// Cores das matérias, sem o cinza de "Geral" (último item).
const AVATAR_COLORS = CATEGORIES.slice(0, -1).map((c) => c.color);

export function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** Quantos posts mostrar no sheet bloqueado depois de um 409. */
export function blockedCount(fromApi: number | null, fromList: number): number {
  return fromApi ?? Math.max(fromList, 1);
}
