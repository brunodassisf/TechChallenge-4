import { ApiError } from '@/api/client';
import { stepFormError, toFormError } from './formError';

describe('toFormError', () => {
  it('erros de campo vão para os campos, sem aviso no topo', () => {
    const err = new ApiError(400, 'Confira os campos destacados.', { email: ['Informe um e-mail válido.'] });
    expect(toFormError(err)).toEqual({ error: null, fieldErrors: { email: ['Informe um e-mail válido.'] } });
  });
  it('erro geral da API vai para o topo', () => {
    expect(toFormError(new ApiError(409, 'Já existe uma conta com esse e-mail.'))).toEqual({
      error: 'Já existe uma conta com esse e-mail.',
      fieldErrors: {},
    });
  });
  it('erro desconhecido vira mensagem genérica', () => {
    expect(toFormError(new Error('x'))).toEqual({ error: 'Algo deu errado. Tente de novo.', fieldErrors: {} });
  });
});

const FIELDS = ['name', 'password'] as const;

describe('stepFormError', () => {
  it('erro em campo da etapa fica no campo', () => {
    const err = new ApiError(400, 'Confira', { name: ['Informe o nome.'] });
    expect(stepFormError(err, FIELDS)).toEqual({ error: null, fieldErrors: { name: ['Informe o nome.'] } });
  });
  it('erro só em campo fora da etapa vai para o topo', () => {
    const err = new ApiError(400, 'Confira', { role: ['Inválido.'] });
    expect(stepFormError(err, FIELDS)).toEqual({ error: 'Inválido.', fieldErrors: {} });
  });
  it('409 vai para o topo', () => {
    const err = new ApiError(409, 'Já existe uma conta com esse e-mail.');
    expect(stepFormError(err, FIELDS)).toEqual({ error: 'Já existe uma conta com esse e-mail.', fieldErrors: {} });
  });
  it('erro que não é da API vira mensagem genérica no topo', () => {
    expect(stepFormError(new Error('x'), FIELDS)).toEqual({ error: 'Algo deu errado. Tente de novo.', fieldErrors: {} });
  });
});
