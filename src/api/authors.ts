import { ApiError, apiRequest, INVALID_RESPONSE } from './client';
import type { AuthorInput, AuthorSummary } from './types';

/** 409 da remoção: o professor ainda tem posts. */
export class AuthorHasPostsError extends ApiError {
  postCount: number | null;

  constructor(message: string, postCount: number | null, body: unknown) {
    super(409, message, undefined, body);
    this.name = 'AuthorHasPostsError';
    this.postCount = postCount;
  }
}

function readPostCount(body: unknown): number | null {
  if (body && typeof body === 'object' && 'postCount' in body) {
    const n = (body as { postCount: unknown }).postCount;
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return null;
}

type RawAuthor = Omit<AuthorSummary, 'postCount' | 'active'> & { postCount?: unknown; active?: unknown };

// Antes dos ajustes no TC-3 a API não mandava postCount/active: 0 posts e ativo.
function normalizeAuthor(a: RawAuthor): AuthorSummary {
  return {
    ...a,
    postCount: typeof a.postCount === 'number' ? a.postCount : 0,
    active: typeof a.active === 'boolean' ? a.active : true,
  };
}

export async function listAuthors(): Promise<AuthorSummary[]> {
  const data = await apiRequest<unknown>('/api/author');
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  return (data as RawAuthor[]).map(normalizeAuthor);
}

export async function createAuthor(input: AuthorInput, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: RawAuthor }>('/api/author', { method: 'POST', body: input, token });
  return normalizeAuthor(res.data);
}

export async function renameAuthor(id: string, name: string, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: RawAuthor }>(`/api/author/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { name },
    token,
  });
  return normalizeAuthor(res.data);
}

export async function setAuthorActive(id: string, active: boolean, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: RawAuthor }>(`/api/author/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { active },
    token,
  });
  return normalizeAuthor(res.data);
}

export async function deleteAuthor(id: string, token: string): Promise<void> {
  try {
    await apiRequest(`/api/author/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      throw new AuthorHasPostsError(err.message, readPostCount(err.body), err.body);
    }
    throw err;
  }
}
