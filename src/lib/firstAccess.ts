import { ApiError } from '@/api/client';
import { toFormError, type FormError } from './formError';

const MIN_PASSWORD = 8;
const STEP_FIELDS = ['password', 'confirmPassword'];

/** Mesmas regras da API, que também tira os espaços das pontas. */
export function validateNewPassword(password: string, confirm: string): Record<string, string[]> {
  const value = password.trim();
  const errors: Record<string, string[]> = {};
  if (value.length < MIN_PASSWORD) errors.password = ['A senha deve ter pelo menos 8 caracteres.'];
  if (value !== confirm.trim()) errors.confirmPassword = ['As senhas não coincidem.'];
  return errors;
}

/** 401, 403 e 409: a senha atual ou a conta mudou, então o login precisa recomeçar. */
export function restartsLogin(err: unknown): err is ApiError {
  return err instanceof ApiError && [401, 403, 409].includes(err.status);
}

/** Erro em campo que a etapa não mostra sobe para o topo, para não sumir. */
export function firstAccessFormError(err: unknown): FormError {
  const form = toFormError(err);
  const entries = Object.entries(form.fieldErrors);
  if (entries.length === 0 || entries.some(([field]) => STEP_FIELDS.includes(field))) return form;
  return { error: entries[0][1][0] ?? null, fieldErrors: {} };
}
