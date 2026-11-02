import { ApiError, apiRequest, INVALID_RESPONSE } from './client';
import type { Post, PostInput } from './types';

export async function listPosts(q?: string): Promise<Post[]> {
  const data = await apiRequest<unknown>('/api/post', { query: { q } });
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  return data as Post[];
}

export function getPost(id: string): Promise<Post> {
  return apiRequest<Post>(`/api/post/${encodeURIComponent(id)}`);
}

export async function createPost(input: PostInput, token: string): Promise<Post> {
  const res = await apiRequest<{ data: Post }>('/api/post', { method: 'POST', body: input, token });
  return res.data;
}

export async function updatePost(id: string, input: PostInput, token: string): Promise<Post> {
  const res = await apiRequest<{ data: Post }>(`/api/post/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: input,
    token,
  });
  return res.data;
}

export async function deletePost(id: string, token: string): Promise<void> {
  await apiRequest(`/api/post/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}
