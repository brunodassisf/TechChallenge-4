import { ApiError } from '@/api/client';

export type FormError = { error: string | null; fieldErrors: Record<string, string[]> };

export function toFormError(err: unknown): FormError {
  if (err instanceof ApiError) {
    return err.fieldErrors ? { error: null, fieldErrors: err.fieldErrors } : { error: err.message, fieldErrors: {} };
  }
  return { error: 'Algo deu errado. Tente de novo.', fieldErrors: {} };
}
