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

export async function listAuthors(): Promise<AuthorSummary[]> {
  const data = await apiRequest<unknown>('/api/author');
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  // Antes do ajuste no TC-3 a lista vem sem postCount: trata como 0 e deixa o 409 da API proteger a remoção.
  return (data as (Omit<AuthorSummary, 'postCount'> & { postCount?: unknown })[]).map((a) => ({
    ...a,
    postCount: typeof a.postCount === 'number' ? a.postCount : 0,
  }));
}

export async function createAuthor(input: AuthorInput, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: AuthorSummary }>('/api/author', { method: 'POST', body: input, token });
  return res.data;
}

export async function renameAuthor(id: string, name: string, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: AuthorSummary }>(`/api/author/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { name },
    token,
  });
  return res.data;
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
