import type { AuthorSummary } from '@/api/types';
import { authorsReducer, initialAuthorsState } from './authorsState';

const ana: AuthorSummary = {
  id: 'a1',
  name: 'Ana',
  userId: 'u1',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
  postCount: 2,
  active: true,
};

describe('authorsReducer', () => {
  it('começa carregando', () => {
    expect(initialAuthorsState.status).toBe('loading');
  });
  it('recarregar com a lista já carregada mantém os itens', () => {
    const loaded = authorsReducer(initialAuthorsState, { type: 'success', authors: [ana] });
    const again = authorsReducer(loaded, { type: 'request', pull: false });
    expect(again.status).toBe('loading');
    expect(again.authors).toEqual([ana]);
  });
  it('puxar para baixo só liga refreshing', () => {
    const loaded = authorsReducer(initialAuthorsState, { type: 'success', authors: [ana] });
    const pulled = authorsReducer(loaded, { type: 'request', pull: true });
    expect(pulled).toMatchObject({ status: 'success', refreshing: true });
  });
  it('falha guarda a mensagem e desliga refreshing', () => {
    const pulled = authorsReducer(initialAuthorsState, { type: 'request', pull: true });
    expect(authorsReducer(pulled, { type: 'failure', message: 'x' })).toMatchObject({
      status: 'error',
      error: 'x',
      refreshing: false,
    });
  });
});
