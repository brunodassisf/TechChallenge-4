import { listPosts } from './posts';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
});

describe('listPosts', () => {
  it('resposta que não é lista vira ApiError em vez de null', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ hello: 'world' }) } as Response);
    await expect(listPosts()).rejects.toMatchObject({ message: 'Resposta inválida do servidor.' });
  });
});
