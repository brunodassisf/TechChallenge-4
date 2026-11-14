import { ApiError } from '@/api/client';
import { signUpFormError, validateSignUp } from './signUp';

const valid = { name: 'Ana', email: 'ana@x.com', password: 'minhasenha', confirmPassword: 'minhasenha' };

describe('validateSignUp', () => {
  it('campos válidos não têm erro', () => {
    expect(validateSignUp(valid)).toEqual({});
  });
  it('nome vazio', () => {
    expect(validateSignUp({ ...valid, name: '' })).toEqual({ name: ['Informe o nome.'] });
  });
  it('nome só com espaços', () => {
    expect(validateSignUp({ ...valid, name: '   ' })).toEqual({ name: ['Informe o nome.'] });
  });
  it('senha curta', () => {
    expect(validateSignUp({ ...valid, password: '1234567', confirmPassword: '1234567' })).toEqual({
      password: ['A senha deve ter pelo menos 8 caracteres.'],
    });
  });
  it('senhas diferentes', () => {
    expect(validateSignUp({ ...valid, confirmPassword: 'outrasenha' })).toEqual({
      confirmPassword: ['As senhas não coincidem.'],
    });
  });
  it('junta erro de nome e de senha', () => {
    expect(validateSignUp({ ...valid, name: '', password: 'curta', confirmPassword: 'curta' })).toEqual({
      name: ['Informe o nome.'],
      password: ['A senha deve ter pelo menos 8 caracteres.'],
    });
  });
});

describe('signUpFormError', () => {
  it('e-mail é campo da etapa', () => {
    const err = new ApiError(400, 'Confira', { email: ['Informe um e-mail válido.'] });
    expect(signUpFormError(err)).toEqual({ error: null, fieldErrors: { email: ['Informe um e-mail válido.'] } });
  });
});
