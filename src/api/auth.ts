import { ApiError, apiRequest } from './client';
import type { FirstAccessInput, LoginResponse } from './types';

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
}

export function firstAccess(input: FirstAccessInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/first-access', {
    method: 'POST',
    body: { ...input, email: input.email.trim() },
  });
}

/** Login recusado porque o professor ainda usa a senha padrão. */
export function isFirstAccessRequired(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 403) return false;
  const { body } = err;
  return !!body && typeof body === 'object' && 'code' in body && body.code === 'FIRST_ACCESS_REQUIRED';
}
