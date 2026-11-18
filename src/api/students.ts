import { ApiError, apiRequest, INVALID_RESPONSE } from './client';
import type { Role, SessionUser, StudentProfile, StudentProfileInput, StudentInput, StudentSummary } from './types';

/** "Meus dados": professor usa a rota de autor; estudante, a de estudante. */
const meUrl = (role: Role) => (role === 'AUTHOR' ? '/api/author/me' : '/api/student/me');

export function getMyProfile(role: Role, token: string): Promise<StudentProfile> {
  return apiRequest<StudentProfile>(meUrl(role), { token });
}

export async function updateMyProfile(role: Role, input: StudentProfileInput, token: string): Promise<SessionUser> {
  const body: Record<string, string> = { name: input.name.trim(), email: input.email.trim() };
  for (const key of ['currentPassword', 'password', 'confirmPassword'] as const) {
    if (input[key] !== '') body[key] = input[key];
  }
  const res = await apiRequest<{ user: SessionUser }>(meUrl(role), { method: 'PUT', body, token });
  return res.user;
}

export async function listStudents(token: string): Promise<StudentSummary[]> {
  const data = await apiRequest<unknown>('/api/student', { token });
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  return data as StudentSummary[];
}

const byId = (id: string) => `/api/student/${encodeURIComponent(id)}`;

export async function updateStudent(id: string, input: StudentInput, token: string): Promise<StudentSummary> {
  const body = { name: input.name.trim(), email: input.email.trim() };
  const res = await apiRequest<{ data: StudentSummary }>(byId(id), { method: 'PUT', body, token });
  return res.data;
}

export async function deleteStudent(id: string, token: string): Promise<void> {
  await apiRequest(byId(id), { method: 'DELETE', token });
}

export async function resetStudentPassword(id: string, token: string): Promise<void> {
  await apiRequest(`${byId(id)}/reset-password`, { method: 'POST', token });
}
