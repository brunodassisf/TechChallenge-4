import type { StudentProfileInput } from '@/api/types';
import { validateNewPassword } from './firstAccess';
import { stepFormError, type FormError } from './formError';

const STEP_FIELDS = ['name', 'email', 'currentPassword', 'password', 'confirmPassword'] as const;

function wantsNewPassword(form: StudentProfileInput): boolean {
  return form.password !== '' || form.confirmPassword !== '';
}

/** Trocar e-mail ou senha exige a senha atual; trocar só o nome, não. */
export function needsCurrentPassword(originalEmail: string, form: StudentProfileInput): boolean {
  return form.email.trim() !== originalEmail.trim() || wantsNewPassword(form);
}

/** Mesmas regras da API; o formato do e-mail fica com ela. */
export function validateProfile(originalEmail: string, form: StudentProfileInput): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!form.name.trim()) errors.name = ['Informe o nome.'];
  if (wantsNewPassword(form)) Object.assign(errors, validateNewPassword(form.password, form.confirmPassword));
  if (needsCurrentPassword(originalEmail, form) && form.currentPassword === '') {
    errors.currentPassword = ['Informe a senha atual.'];
  }
  return errors;
}

export function profileFormError(err: unknown): FormError {
  return stepFormError(err, STEP_FIELDS);
}
