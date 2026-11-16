import { ApiError, apiRequest, INVALID_RESPONSE } from './client';
import type { SessionUser, StudentProfile, StudentProfileInput, StudentInput, StudentSummary } from './types';

const ME = '/api/student/me';

export function getMyProfile(token: string): Promise<StudentProfile> {
  return apiRequest<StudentProfile>(ME, { token });
}

export async function updateMyProfile(input: StudentProfileInput, token: string): Promise<SessionUser> {
  const body: Record<string, string> = { name: input.name.trim(), email: input.email.trim() };
  for (const key of ['currentPassword', 'password', 'confirmPassword'] as const) {
    if (input[key] !== '') body[key] = input[key];
  }
  const res = await apiRequest<{ user: SessionUser }>(ME, { method: 'PUT', body, token });
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
