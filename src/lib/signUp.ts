import type { SignUpInput } from '@/api/types';
import { validateNewPassword } from './firstAccess';
import { stepFormError, type FormError } from './formError';

const STEP_FIELDS = ['name', 'email', 'password', 'confirmPassword'] as const;

/** Mesmas regras da API; o formato do e-mail fica com ela. */
export function validateSignUp(input: SignUpInput): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!input.name.trim()) errors.name = ['Informe o nome.'];
  return { ...errors, ...validateNewPassword(input.password, input.confirmPassword) };
}

export function signUpFormError(err: unknown): FormError {
  return stepFormError(err, STEP_FIELDS);
}
