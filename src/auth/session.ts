import type { Role, SessionUser } from '@/api/types';

export type Session = { token: string; expiresAt: string; user: SessionUser };

const ROLES: Role[] = ['ADMIN', 'AUTHOR', 'STUDENT'];

export function isExpired(session: Pick<Session, 'expiresAt'>, now: Date = new Date()): boolean {
  const t = new Date(session.expiresAt).getTime();
  return Number.isNaN(t) || t <= now.getTime();
}

/** Lê a sessão guardada; devolve null se faltar algo, estiver corrompida ou vencida. */
export function parseStoredSession(raw: string | null, now: Date = new Date()): Session | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const s = data as Partial<Session>;
  const u = s.user as Partial<SessionUser> | undefined;
  const expires = typeof s.expiresAt === 'string' ? new Date(s.expiresAt) : null;

  const ok =
    typeof s.token === 'string' && s.token.length > 0 &&
    expires !== null && !Number.isNaN(expires.getTime()) && expires > now &&
    !!u && typeof u.id === 'string' && typeof u.name === 'string' &&
    ROLES.includes(u.role as Role) &&
    (u.authorId === null || typeof u.authorId === 'string');

  return ok ? (s as Session) : null;
}
