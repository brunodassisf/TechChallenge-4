import { ApiError } from '@/api/client';
import { firstAccessFormError, restartsLogin, validateNewPassword } from './firstAccess';

describe('validateNewPassword', () => {
  it('senhas válidas e iguais não têm erro', () => {
    expect(validateNewPassword('minhasenha', 'minhasenha')).toEqual({});
  });
  it('senha curta', () => {
    expect(validateNewPassword('1234567', '1234567')).toEqual({
      password: ['A senha deve ter pelo menos 8 caracteres.'],
    });
  });
  it('só espaços conta como curta', () => {
    expect(validateNewPassword('          ', '          ')).toEqual({
      password: ['A senha deve ter pelo menos 8 caracteres.'],
    });
  });
  it('senhas diferentes', () => {
    expect(validateNewPassword('minhasenha', 'outrasenha')).toEqual({
      confirmPassword: ['As senhas não coincidem.'],
    });
  });
  it('espaços nas pontas não contam, como na API', () => {
    expect(validateNewPassword(' minhasenha ', 'minhasenha')).toEqual({});
  });
});

describe('restartsLogin', () => {
  it.each([401, 403, 409])('%i volta para o login', (status) => {
    expect(restartsLogin(new ApiError(status, 'x'))).toBe(true);
  });
  it.each([0, 400, 500])('%i fica na etapa', (status) => {
    expect(restartsLogin(new ApiError(status, 'x'))).toBe(false);
  });
  it('erro que não é da API fica na etapa', () => {
    expect(restartsLogin(new Error('x'))).toBe(false);
  });
});

describe('firstAccessFormError', () => {
  it('erro em campo da etapa fica no campo', () => {
    const err = new ApiError(400, 'Confira', { password: ['Escolha uma senha diferente da senha padrão.'] });
    expect(firstAccessFormError(err)).toEqual({
      error: null,
      fieldErrors: { password: ['Escolha uma senha diferente da senha padrão.'] },
    });
  });
  it('erro em campo que a etapa não mostra vai para o topo', () => {
    const err = new ApiError(400, 'Confira', { email: ['Informe um e-mail válido.'] });
    expect(firstAccessFormError(err)).toEqual({ error: 'Informe um e-mail válido.', fieldErrors: {} });
  });
  it('sem conexão vai para o topo', () => {
    expect(firstAccessFormError(new ApiError(0, 'Sem conexão com o servidor.'))).toEqual({
      error: 'Sem conexão com o servidor.',
      fieldErrors: {},
    });
  });
});
