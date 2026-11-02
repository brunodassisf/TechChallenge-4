import type { SessionUser } from '@/api/types';
import { authorName, canCreatePost, canManagePost } from './post';

const prof: SessionUser = { id: 'u1', name: 'Ana', role: 'AUTHOR', authorId: 'a1' };
const aluno: SessionUser = { id: 'u2', name: 'Bia', role: 'STUDENT', authorId: null };
const admin: SessionUser = { id: 'u3', name: 'Adm', role: 'ADMIN', authorId: null };

describe('permissões', () => {
  it('só quem tem perfil de autor cria (a API recusa admin sem Author)', () => {
    expect(canCreatePost(prof)).toBe(true);
    expect(canCreatePost(admin)).toBe(false);
    expect(canCreatePost({ ...admin, authorId: 'a9' })).toBe(true);
    expect(canCreatePost(aluno)).toBe(false);
    expect(canCreatePost(null)).toBe(false);
  });
  it('só o dono ou admin gerencia o post', () => {
    expect(canManagePost(prof, { authorId: 'a1' })).toBe(true);
    expect(canManagePost(prof, { authorId: 'a2' })).toBe(false);
    expect(canManagePost(admin, { authorId: 'a2' })).toBe(true);
    expect(canManagePost(aluno, { authorId: 'a1' })).toBe(false);
    expect(canManagePost(null, { authorId: 'a1' })).toBe(false);
  });
});

describe('authorName', () => {
  it('usa o nome do autor', () => {
    expect(authorName({ authors: { id: 'a1', name: 'Ana Lima', userId: 'u1' } })).toBe('Ana Lima');
  });
  it('autor ausente ou sem nome', () => {
    expect(authorName({ authors: null })).toBe('Autor desconhecido');
    expect(authorName({ authors: { id: 'a1', name: '  ', userId: null } })).toBe('Autor desconhecido');
  });
});
