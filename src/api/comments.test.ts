import { createComment, deleteComment, listComments, updateComment } from './comments';

const fetchMock = jest.fn();
const ok = (body: unknown, status = 200) => ({ ok: true, status, json: async () => body }) as Response;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
});

describe('comments api', () => {
  it('listComments chama a rota do post', async () => {
    fetchMock.mockResolvedValue(ok([]));
    await expect(listComments('p1')).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test:3000/api/post/p1/comment');
  });

  it('listComments rejeita resposta que não é lista', async () => {
    fetchMock.mockResolvedValue(ok({ hello: 'world' }));
    await expect(listComments('p1')).rejects.toMatchObject({ message: 'Resposta inválida do servidor.' });
  });

  it('createComment manda text e token e devolve data', async () => {
    fetchMock.mockResolvedValue(ok({ data: { id: 'c1' } }, 201));
    await expect(createComment('p1', 'oi', 't')).resolves.toEqual({ id: 'c1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/post/p1/comment');
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ text: 'oi' }) });
    expect(init.headers.Authorization).toBe('Bearer t');
  });

  it('updateComment usa PUT na rota do comentário', async () => {
    fetchMock.mockResolvedValue(ok({ data: { id: 'c1' } }));
    await updateComment('c1', 'novo', 't');
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test:3000/api/comment/c1');
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
  });

  it('deleteComment usa DELETE', async () => {
    fetchMock.mockResolvedValue(ok({ message: 'ok' }));
    await deleteComment('c1', 't');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
});
