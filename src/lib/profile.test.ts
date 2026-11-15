import { ApiError } from '@/api/client';
import { needsCurrentPassword, profileFormError, validateProfile } from './profile';

const ORIGINAL = 'ana@x.com';
const form = { name: 'Ana', email: 'ana@x.com', currentPassword: '', password: '', confirmPassword: '' };

describe('needsCurrentPassword', () => {
  it('nada mudou', () => {
    expect(needsCurrentPassword(ORIGINAL, form)).toBe(false);
  });
  it('só o nome mudou', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, name: 'Ana Souza' })).toBe(false);
  });
  it('e-mail mudou', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, email: 'ana@y.com' })).toBe(true);
  });
  it('espaços nas pontas do e-mail não contam', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, email: ' ana@x.com ' })).toBe(false);
  });
  it('nova senha preenchida', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, password: 'x' })).toBe(true);
  });
  it('só repetir senha preenchido', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, confirmPassword: 'x' })).toBe(true);
  });
});

describe('validateProfile', () => {
  it('troca só do nome não pede senha', () => {
    expect(validateProfile(ORIGINAL, { ...form, name: 'Ana Souza' })).toEqual({});
  });
  it('nome vazio ou só espaços', () => {
    expect(validateProfile(ORIGINAL, { ...form, name: '  ' })).toEqual({ name: ['Informe o nome.'] });
  });
  it('e-mail mudou sem senha atual', () => {
    expect(validateProfile(ORIGINAL, { ...form, email: 'ana@y.com' })).toEqual({
      currentPassword: ['Informe a senha atual.'],
    });
  });
  it('e-mail mudou com senha atual', () => {
    expect(validateProfile(ORIGINAL, { ...form, email: 'ana@y.com', currentPassword: 'atual123' })).toEqual({});
  });
  it('senha nova curta', () => {
    expect(
      validateProfile(ORIGINAL, { ...form, currentPassword: 'a', password: '1234567', confirmPassword: '1234567' }),
    ).toEqual({ password: ['A senha deve ter pelo menos 8 caracteres.'] });
  });
  it('senhas novas diferentes', () => {
    expect(
      validateProfile(ORIGINAL, { ...form, currentPassword: 'a', password: 'novasenha', confirmPassword: 'outra123' }),
    ).toEqual({ confirmPassword: ['As senhas não coincidem.'] });
  });
  it('só repetir senha preenchido valida a senha nova e pede a atual', () => {
    expect(validateProfile(ORIGINAL, { ...form, confirmPassword: 'novasenha' })).toEqual({
      password: ['A senha deve ter pelo menos 8 caracteres.'],
      confirmPassword: ['As senhas não coincidem.'],
      currentPassword: ['Informe a senha atual.'],
    });
  });
});

describe('profileFormError', () => {
  it('senha atual incorreta fica no campo', () => {
    const err = new ApiError(400, 'Confira', { currentPassword: ['Senha atual incorreta.'] });
    expect(profileFormError(err)).toEqual({
      error: null,
      fieldErrors: { currentPassword: ['Senha atual incorreta.'] },
    });
  });
  it('campo que a tela não mostra vai para o topo', () => {
    const err = new ApiError(400, 'Confira', { role: ['Inválido.'] });
    expect(profileFormError(err)).toEqual({ error: 'Inválido.', fieldErrors: {} });
  });
});
