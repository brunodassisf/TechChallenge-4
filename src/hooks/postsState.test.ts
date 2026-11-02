import type { Post } from '@/api/types';
import { initialPostsState, postsReducer } from './postsState';

const post = { id: '1', title: 't' } as Post;

describe('postsReducer', () => {
  it('guarda para qual busca vieram os posts', () => {
    const s = postsReducer(initialPostsState, { type: 'success', query: 'ana', posts: [post] });
    expect(s).toMatchObject({ status: 'success', posts: [post], resultQuery: 'ana', refreshing: false });
  });

  it('nova busca mantém o resultado anterior com a busca anterior até a resposta chegar', () => {
    const loaded = postsReducer(initialPostsState, { type: 'success', query: 'his', posts: [post] });
    const s = postsReducer(loaded, { type: 'request', pull: false });
    expect(s).toMatchObject({ status: 'loading', posts: [post], resultQuery: 'his' });
  });

  it('puxar para baixo liga o refreshing sem trocar o status', () => {
    const loaded = postsReducer(initialPostsState, { type: 'success', query: '', posts: [post] });
    expect(postsReducer(loaded, { type: 'request', pull: true })).toMatchObject({ status: 'success', refreshing: true });
  });

  it('falha guarda a mensagem e desliga o refreshing', () => {
    const s = postsReducer({ ...initialPostsState, refreshing: true }, { type: 'failure', message: 'Sem conexão' });
    expect(s).toMatchObject({ status: 'error', error: 'Sem conexão', refreshing: false });
  });
});
