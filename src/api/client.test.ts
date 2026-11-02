import { ApiError, apiRequest } from './client';

const fetchMock = jest.fn();

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000/';
});

describe('apiRequest', () => {
  it('monta URL, query e header Bearer', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await apiRequest('/api/post', { query: { q: ' ana ' }, token: 'tok' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/post?q=ana');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('não manda q só com espaços', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await apiRequest('/api/post', { query: { q: '   ' } });
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test:3000/api/post');
  });

  it('envia corpo JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { data: {} }));
    await apiRequest('/api/post', { method: 'POST', body: { title: 'a' } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe('{"title":"a"}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('400 com errors vira ApiError com fieldErrors', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { errors: { title: ['Informe o título.'] } }));
    await expect(apiRequest('/api/post')).rejects.toMatchObject({
      status: 400,
      fieldErrors: { title: ['Informe o título.'] },
      message: 'Confira os campos destacados.',
    });
  });

  it('usa a mensagem error da API', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'Post não encontrado.' }));
    await expect(apiRequest('/api/post/x')).rejects.toMatchObject({ status: 404, message: 'Post não encontrado.' });
  });

  it('corpo não-JSON (página de erro) vira ApiError', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);
    await expect(apiRequest('/api/post')).rejects.toMatchObject({ status: 500, message: 'Erro 500 no servidor.' });
  });

  it('falha de rede vira ApiError status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const err = await apiRequest('/api/post').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, message: 'Sem conexão com o servidor.' });
  });

  it('sem EXPO_PUBLIC_API_URL avisa a configuração', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    await expect(apiRequest('/api/post')).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
