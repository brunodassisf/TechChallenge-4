import { ApiError, apiRequest, INVALID_RESPONSE } from './client';
import type { Comment } from './types';

export async function listComments(postId: string): Promise<Comment[]> {
  const data = await apiRequest<unknown>(`/api/post/${encodeURIComponent(postId)}/comment`);
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  return data as Comment[];
}

export async function createComment(postId: string, text: string, token: string): Promise<Comment> {
  const res = await apiRequest<{ data: Comment }>(`/api/post/${encodeURIComponent(postId)}/comment`, {
    method: 'POST',
    body: { text },
    token,
  });
  return res.data;
}

export async function updateComment(id: string, text: string, token: string): Promise<Comment> {
  const res = await apiRequest<{ data: Comment }>(`/api/comment/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { text },
    token,
  });
  return res.data;
}

export async function deleteComment(id: string, token: string): Promise<void> {
  await apiRequest(`/api/comment/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}
