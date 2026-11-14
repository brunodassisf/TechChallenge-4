import { ApiError } from '@/api/client';

export type FormError = { error: string | null; fieldErrors: Record<string, string[]> };

export function toFormError(err: unknown): FormError {
  if (err instanceof ApiError) {
    return err.fieldErrors ? { error: null, fieldErrors: err.fieldErrors } : { error: err.message, fieldErrors: {} };
  }
  return { error: 'Algo deu errado. Tente de novo.', fieldErrors: {} };
}

/** Erro em campo que a etapa não mostra sobe para o topo, para não sumir. */
export function stepFormError(err: unknown, stepFields: readonly string[]): FormError {
  const form = toFormError(err);
  const entries = Object.entries(form.fieldErrors);
  if (entries.length === 0 || entries.some(([field]) => stepFields.includes(field))) return form;
  return { error: entries[0][1][0] ?? null, fieldErrors: {} };
}
