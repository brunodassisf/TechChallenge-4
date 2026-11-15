import { apiRequest } from './client';
import type { SessionUser, StudentProfile, StudentProfileInput } from './types';

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
