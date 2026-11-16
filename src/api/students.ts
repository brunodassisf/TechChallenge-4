import { ApiError, apiRequest, INVALID_RESPONSE } from './client';
import type { SessionUser, StudentProfile, StudentProfileInput, StudentSummary } from './types';

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
