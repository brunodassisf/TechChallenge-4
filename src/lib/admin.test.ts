import type { AuthorSummary, SessionUser } from '@/api/types';
import { CATEGORIES } from '@/theme';
import {
  authorActions,
  authorSubtitle,
  avatarColor,
  blockedCount,
  homeRouteFor,
  isAdmin,
  postCountLabel,
  sortAuthors,
  teacherCountLabel,
} from './admin';

const admin: SessionUser = { id: 'u1', name: 'Adm', role: 'ADMIN', authorId: null };
const prof: SessionUser = { id: 'u2', name: 'Ana', role: 'AUTHOR', authorId: 'a1' };
const aluno: SessionUser = { id: 'u3', name: 'Bia', role: 'STUDENT', authorId: null };

describe('papel', () => {
  it('isAdmin', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(prof)).toBe(false);
    expect(isAdmin(aluno)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
  it('homeRouteFor', () => {
    expect(homeRouteFor(admin)).toBe('/admin');
    expect(homeRouteFor(prof)).toBe('/');
    expect(homeRouteFor(aluno)).toBe('/');
    expect(homeRouteFor(null)).toBe('/');
  });
});

describe('rótulos', () => {
  it('postCountLabel', () => {
    expect(postCountLabel(0)).toBe('Nenhum post');
    expect(postCountLabel(1)).toBe('1 post');
    expect(postCountLabel(12)).toBe('12 posts');
  });
  it('teacherCountLabel', () => {
    expect(teacherCountLabel(0)).toBe('0 professores cadastrados');
    expect(teacherCountLabel(1)).toBe('1 professor cadastrado');
    expect(teacherCountLabel(4)).toBe('4 professores cadastrados');
  });
  it('authorSubtitle junta contagem e mês de cadastro', () => {
    expect(authorSubtitle({ postCount: 12, createdAt: '2026-03-15T12:00:00.000Z' })).toBe('12 posts · desde mar 2026');
  });
  it('authorSubtitle sem data válida mostra só a contagem', () => {
    expect(authorSubtitle({ postCount: 0, createdAt: '' })).toBe('Nenhum post');
  });
});

describe('avatarColor', () => {
  it('usa as cores das matérias em ciclo, sem o cinza de Geral', () => {
    expect(avatarColor(0)).toBe(CATEGORIES[0].color);
    expect(avatarColor(7)).toBe(CATEGORIES[7].color);
    expect(avatarColor(8)).toBe(CATEGORIES[0].color);
  });
});

describe('blockedCount', () => {
  it('prefere o número da API', () => {
    expect(blockedCount(3, 0)).toBe(3);
  });
  it('sem número da API usa o da lista, no mínimo 1', () => {
    expect(blockedCount(null, 5)).toBe(5);
    expect(blockedCount(null, 0)).toBe(1);
  });
});

describe('teacherCountLabel com inativos', () => {
  it('sem inativos não muda', () => {
    expect(teacherCountLabel(5, 0)).toBe('5 professores cadastrados');
  });
  it('singular e plural de inativos', () => {
    expect(teacherCountLabel(5, 1)).toBe('5 professores cadastrados · 1 inativo');
    expect(teacherCountLabel(5, 2)).toBe('5 professores cadastrados · 2 inativos');
    expect(teacherCountLabel(1, 1)).toBe('1 professor cadastrado · 1 inativo');
  });
});

describe('sortAuthors', () => {
  const mk = (id: string, active: boolean): AuthorSummary => ({
    id,
    name: id,
    userId: null,
    createdAt: '',
    updatedAt: '',
    postCount: 0,
    active,
  });
  it('ativos primeiro, mantendo a ordem da API em cada grupo', () => {
    const list = [mk('a', false), mk('b', true), mk('c', false), mk('d', true)];
    expect(sortAuthors(list).map((a) => a.id)).toEqual(['b', 'd', 'a', 'c']);
  });
  it('não muta a lista recebida', () => {
    const list = [mk('a', false), mk('b', true)];
    sortAuthors(list);
    expect(list.map((a) => a.id)).toEqual(['a', 'b']);
  });
});

describe('authorActions', () => {
  it('ativo com posts', () => {
    expect(authorActions({ active: true, postCount: 3 })).toEqual(['rename', 'deactivate']);
  });
  it('ativo sem posts', () => {
    expect(authorActions({ active: true, postCount: 0 })).toEqual(['rename', 'deactivate', 'remove']);
  });
  it('inativo com posts', () => {
    expect(authorActions({ active: false, postCount: 3 })).toEqual(['rename', 'reactivate']);
  });
  it('inativo sem posts', () => {
    expect(authorActions({ active: false, postCount: 0 })).toEqual(['rename', 'reactivate', 'remove']);
  });
});
