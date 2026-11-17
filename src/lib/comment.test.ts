import type { SessionUser } from '@/api/types';
import { canComment, canDeleteComment, canEditComment } from './comment';

const aluno: SessionUser = { id: 'u1', name: 'Bia', role: 'STUDENT', authorId: null, studentId: 's1' };
const outroAluno: SessionUser = { id: 'u2', name: 'Caio', role: 'STUDENT', authorId: null, studentId: 's2' };
const prof: SessionUser = { id: 'u3', name: 'Ana', role: 'AUTHOR', authorId: 'a1', studentId: null };
const admin: SessionUser = { id: 'u4', name: 'Adm', role: 'ADMIN', authorId: null, studentId: null };
const doAluno = { studentId: 's1' };
const post = { authorId: 'a1' };

describe('canComment', () => {
  it('só estudante com studentId', () => {
    expect(canComment(aluno)).toBe(true);
    expect(canComment(prof)).toBe(false);
    expect(canComment(admin)).toBe(false);
    expect(canComment(null)).toBe(false);
  });
  it('sessão antiga sem studentId não comenta', () => {
    expect(canComment({ ...aluno, studentId: undefined })).toBe(false);
  });
});

describe('canEditComment', () => {
  it('só o dono', () => {
    expect(canEditComment(aluno, doAluno)).toBe(true);
    expect(canEditComment(outroAluno, doAluno)).toBe(false);
    expect(canEditComment(prof, doAluno)).toBe(false);
    expect(canEditComment(admin, doAluno)).toBe(false);
    expect(canEditComment(null, doAluno)).toBe(false);
  });
  it('studentId ausente não casa com nada', () => {
    expect(canEditComment({ ...aluno, studentId: undefined }, doAluno)).toBe(false);
  });
});

describe('canDeleteComment', () => {
  it('dono, professor do post e admin', () => {
    expect(canDeleteComment(aluno, doAluno, post)).toBe(true);
    expect(canDeleteComment(prof, doAluno, post)).toBe(true);
    expect(canDeleteComment(admin, doAluno, post)).toBe(true);
  });
  it('outro aluno, professor de outro post e visitante não', () => {
    expect(canDeleteComment(outroAluno, doAluno, post)).toBe(false);
    expect(canDeleteComment(prof, doAluno, { authorId: 'a2' })).toBe(false);
    expect(canDeleteComment(null, doAluno, post)).toBe(false);
  });
});
