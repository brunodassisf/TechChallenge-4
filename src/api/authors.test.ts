import { AuthorHasPostsError, deleteAuthor, listAuthors, setAuthorActive } from './authors';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
});

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue({ ok: status < 300, status, json: async () => body } as Response);
}

const base = { id: 'a1', name: 'Ana', userId: 'u1', createdAt: '2026-03-02T10:00:00.000Z', updatedAt: '2026-03-02T10:00:00.000Z' };

describe('listAuthors', () => {
  it('resposta que não é lista vira erro', async () => {
    respond(200, { hello: 'world' });
    await expect(listAuthors()).rejects.toMatchObject({ message: 'Resposta inválida do servidor.' });
  });
  it('mantém postCount numérico', async () => {
    respond(200, [{ ...base, postCount: 4 }]);
    await expect(listAuthors()).resolves.toEqual([{ ...base, postCount: 4, active: true }]);
  });
  it('API antiga sem postCount vira 0', async () => {
    respond(200, [base]);
    const [a] = await listAuthors();
    expect(a.postCount).toBe(0);
  });
  it('mantém active da API', async () => {
    respond(200, [{ ...base, postCount: 1, active: false }]);
    const [a] = await listAuthors();
    expect(a.active).toBe(false);
  });
  it('API antiga sem active vira ativo', async () => {
    respond(200, [base]);
    const [a] = await listAuthors();
    expect(a.active).toBe(true);
  });
});

describe('deleteAuthor', () => {
  it('409 expõe postCount', async () => {
    respond(409, { error: 'Este professor tem 2 posts.', postCount: 2 });
    const err = await deleteAuthor('a1', 'tk').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthorHasPostsError);
    expect(err).toMatchObject({ status: 409, postCount: 2, message: 'Este professor tem 2 posts.' });
  });
  it('409 sem postCount no corpo dá postCount null', async () => {
    respond(409, { error: 'Tem posts.' });
    await expect(deleteAuthor('a1', 'tk')).rejects.toMatchObject({ postCount: null });
  });
  it('outros erros passam como estão', async () => {
    respond(404, { error: 'Autor não encontrado.' });
    const err = await deleteAuthor('a1', 'tk').catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(AuthorHasPostsError);
    expect(err).toMatchObject({ status: 404 });
  });
  it('envia DELETE com o token', async () => {
    respond(200, { message: 'ok' });
    await deleteAuthor('a 1', 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/author/a%201');
    expect(init).toMatchObject({ method: 'DELETE', headers: { Authorization: 'Bearer tk' } });
  });
});

describe('setAuthorActive', () => {
  it('envia PATCH com { active } e devolve o professor normalizado', async () => {
    respond(200, { data: { ...base, active: false }, message: 'Professor desativado.' });
    const a = await setAuthorActive('a1', false, 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/author/a1/status');
    expect(init).toMatchObject({ method: 'PATCH', body: JSON.stringify({ active: false }) });
    expect(a).toEqual({ ...base, postCount: 0, active: false });
  });
  it('409 sem conta de login vira ApiError com a mensagem', async () => {
    respond(409, { error: 'Este professor não tem conta de login para desativar.' });
    await expect(setAuthorActive('a1', false, 'tk')).rejects.toMatchObject({
      status: 409,
      message: 'Este professor não tem conta de login para desativar.',
    });
  });
});
