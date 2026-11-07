import { firstAccess, isFirstAccessRequired } from './auth';
import { ApiError } from './client';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
});

describe('isFirstAccessRequired', () => {
  it('403 com o código', () => {
    const err = new ApiError(403, 'Primeiro acesso', undefined, { code: 'FIRST_ACCESS_REQUIRED' });
    expect(isFirstAccessRequired(err)).toBe(true);
  });
  it('403 de conta desativada não é primeiro acesso', () => {
    const err = new ApiError(403, 'Conta desativada.', undefined, { error: 'Conta desativada.' });
    expect(isFirstAccessRequired(err)).toBe(false);
  });
  it('mesmo código com outro status não conta', () => {
    const err = new ApiError(401, 'x', undefined, { code: 'FIRST_ACCESS_REQUIRED' });
    expect(isFirstAccessRequired(err)).toBe(false);
  });
  it('corpo vazio ou erro comum não conta', () => {
    expect(isFirstAccessRequired(new ApiError(403, 'x'))).toBe(false);
    expect(isFirstAccessRequired(new Error('x'))).toBe(false);
  });
});

describe('firstAccess', () => {
  it('envia POST com os quatro campos e o e-mail sem espaços nas pontas', async () => {
    const session = { message: 'ok', token: 't', tokenType: 'Bearer', expiresAt: '2026-12-01', user: { id: 'u1' } };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => session } as Response);
    const res = await firstAccess({
      email: ' ana@x.com ',
      currentPassword: 'padrao123',
      password: 'minhasenha',
      confirmPassword: 'minhasenha',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/auth/first-access');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      email: 'ana@x.com',
      currentPassword: 'padrao123',
      password: 'minhasenha',
      confirmPassword: 'minhasenha',
    });
    expect(res).toEqual(session);
  });
});
