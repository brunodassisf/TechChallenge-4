import { ApiError } from '@/api/client';
import { toFormError } from './formError';

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
