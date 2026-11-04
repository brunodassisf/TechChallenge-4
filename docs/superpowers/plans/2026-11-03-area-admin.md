# Área de administração — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quem entra com papel ADMIN cai num Painel protegido onde lista, cadastra, renomeia e remove professores.

**Architecture:** Três rotas novas em `src/app/admin/`, embrulhadas em `Stack.Protected guard={isAdmin(user)}` no layout raiz. Camada HTTP em `src/api/authors.ts` (com erro tipado para o 409 da remoção), regras puras em `src/lib/admin.ts`, lista com `useReducer` em `src/hooks/useAuthors.ts`, e componentes pequenos (linha, sheet de ações, sheet de remoção). A navegação por papel depois do login roda num efeito que espera o contexto de auth atualizar, para o guard já estar `true` quando o app navega para `/admin`.

**Tech Stack:** Expo SDK 57, Expo Router 57 (typed routes), React 19, TypeScript 6, Jest (`jest-expo`), `StyleSheet` + `src/theme.ts`.

**Spec:** `docs/superpowers/specs/2026-11-03-area-admin-design.md`

## Global Constraints

- Textos da interface em português, exatamente como no spec ("Professores", "N professores cadastrados", "Nenhum post", "＋ Professor", "Professor cadastrado", "Nome atualizado", "Professor removido", "Entendi", "Remover professor", "Cancelar").
- Cor da área: `colors.admin = '#C3A6FF'`.
- Datas do Painel no formato "mar 2026" (meses fixos, sem `Intl`).
- Senha inicial: dica "Mínimo de 8 caracteres. Passe a senha para o professor, que entra com ela no app e no site."
- Chamadas autenticadas passam por `useRequireToken()` e `useHandleApiError()` (`src/hooks/useAuthGuard.ts`).
- Imports com alias `@/` → `src/`. Telas só em `src/app/`.
- Antes de cada commit: `npm test`, `npx tsc --noEmit`, `npx expo lint` passam.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Regra do React Compiler (`react-hooks/refs`): não ler `ref.current` durante o render; em efeitos pode.

## Review Focus

1. **API ainda sem os ajustes do TC-3** (item sem `postCount`): o Painel mostra "Nenhum post" e a remoção depende do 409 da API, sem quebrar nem mostrar "undefined posts". Teste em `authors.test.ts` (Task 1).
2. **409 sem `postCount` no corpo**: o sheet bloqueado aparece mesmo assim, com o número da lista (mínimo 1). Teste em `authors.test.ts` (`postCount` vira `null`) e regra `blockedCount` em `admin.test.ts` (Tasks 1 e 2).
3. **Data de cadastro inválida ou ausente**: a linha do professor mostra só a contagem, sem "desde ". Teste de `authorSubtitle` (Task 2).
4. **Singular/plural** em "1 professor cadastrado" e "1 post". Testes de `teacherCountLabel` e `postCountLabel` (Task 2).
5. **Resposta de erro da API que não é objeto** (ex.: HTML no 409): `ApiError.body` fica `null` e nada quebra. Teste em `client.test.ts` (Task 1).

---

### Task 1: Camada HTTP de professores

**Files:**
- Modify: `src/api/client.ts` (classe `ApiError` e o `throw` de não-2xx)
- Modify: `src/api/types.ts`
- Create: `src/api/authors.ts`
- Test: `src/api/client.test.ts` (acrescentar), `src/api/authors.test.ts`

**Interfaces:**
- Produces:
  - `ApiError` ganha `body: unknown` (corpo JSON da resposta de erro, ou `null`). Construtor: `new ApiError(status, message, fieldErrors?, body?)`.
  - `type AuthorSummary = { id: string; name: string; userId: string | null; createdAt: string; updatedAt: string; postCount: number }`
  - `type AuthorInput = { name: string; email: string; password: string }`
  - `class AuthorHasPostsError extends ApiError { postCount: number | null }` (status 409)
  - `listAuthors(): Promise<AuthorSummary[]>`
  - `createAuthor(input: AuthorInput, token: string): Promise<AuthorSummary>`
  - `renameAuthor(id: string, name: string, token: string): Promise<AuthorSummary>`
  - `deleteAuthor(id: string, token: string): Promise<void>` (lança `AuthorHasPostsError` no 409)

- [ ] **Step 1: Testes que falham**

Acrescente ao fim de `src/api/client.test.ts` (o arquivo já define `fetchMock` e o `beforeEach` com `EXPO_PUBLIC_API_URL`; confira os nomes antes e ajuste se forem outros):

```ts
describe('ApiError.body', () => {
  it('guarda o corpo JSON da resposta de erro', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Tem posts.', postCount: 3 }),
    } as Response);
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 409, body: { error: 'Tem posts.', postCount: 3 } });
  });
  it('corpo que não é JSON vira null', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => {
        throw new SyntaxError('html');
      },
    } as unknown as Response);
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 409, body: null });
  });
});
```

Crie `src/api/authors.test.ts`:

```ts
import { AuthorHasPostsError, deleteAuthor, listAuthors } from './authors';

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
    await expect(listAuthors()).resolves.toEqual([{ ...base, postCount: 4 }]);
  });
  it('API antiga sem postCount vira 0', async () => {
    respond(200, [base]);
    const [a] = await listAuthors();
    expect(a.postCount).toBe(0);
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/api`
Expected: FAIL (`Cannot find module './authors'` e `body` ausente no `ApiError`).

- [ ] **Step 3: `ApiError.body`**

Em `src/api/client.ts`, troque a classe por:

```ts
export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  /** Corpo JSON da resposta de erro (ou null quando não era JSON). */
  body: unknown;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>, body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.body = body;
  }
}
```

E no fim do bloco `if (!res.ok)`, troque `throw new ApiError(res.status, message, fieldErrors);` por:

```ts
    throw new ApiError(res.status, message, fieldErrors, data);
```

(`data` já é `null` quando o corpo não é JSON.)

- [ ] **Step 4: Tipos**

Acrescente ao fim de `src/api/types.ts`:

```ts
export type AuthorSummary = {
  id: string;
  name: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  postCount: number;
};

export type AuthorInput = { name: string; email: string; password: string };
```

- [ ] **Step 5: `src/api/authors.ts`**

```ts
import { ApiError, apiRequest, INVALID_RESPONSE } from './client';
import type { AuthorInput, AuthorSummary } from './types';

/** 409 da remoção: o professor ainda tem posts. */
export class AuthorHasPostsError extends ApiError {
  postCount: number | null;

  constructor(message: string, postCount: number | null, body: unknown) {
    super(409, message, undefined, body);
    this.name = 'AuthorHasPostsError';
    this.postCount = postCount;
  }
}

function readPostCount(body: unknown): number | null {
  if (body && typeof body === 'object' && 'postCount' in body) {
    const n = (body as { postCount: unknown }).postCount;
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return null;
}

export async function listAuthors(): Promise<AuthorSummary[]> {
  const data = await apiRequest<unknown>('/api/author');
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  // Antes do ajuste no TC-3 a lista vem sem postCount: trata como 0 e deixa o 409 da API proteger a remoção.
  return (data as (Omit<AuthorSummary, 'postCount'> & { postCount?: unknown })[]).map((a) => ({
    ...a,
    postCount: typeof a.postCount === 'number' ? a.postCount : 0,
  }));
}

export async function createAuthor(input: AuthorInput, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: AuthorSummary }>('/api/author', { method: 'POST', body: input, token });
  return res.data;
}

export async function renameAuthor(id: string, name: string, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: AuthorSummary }>(`/api/author/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { name },
    token,
  });
  return res.data;
}

export async function deleteAuthor(id: string, token: string): Promise<void> {
  try {
    await apiRequest(`/api/author/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      throw new AuthorHasPostsError(err.message, readPostCount(err.body), err.body);
    }
    throw err;
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest src/api && npx tsc --noEmit && npx expo lint`
Expected: PASS, sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/api
git commit -m "feat: camada HTTP de professores

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Regras puras da área de admin

**Files:**
- Modify: `src/lib/formatDate.ts`, `src/lib/formatDate.test.ts`
- Create: `src/lib/admin.ts`, `src/lib/admin.test.ts`

**Interfaces:**
- Consumes: `AuthorSummary`, `SessionUser` (`@/api/types`); `CATEGORIES` (`@/theme`).
- Produces:
  - `formatMonthYear(iso: string): string` → `"mar 2026"` ou `''`
  - `isAdmin(user: SessionUser | null): boolean`
  - `homeRouteFor(user: SessionUser | null): '/admin' | '/'`
  - `postCountLabel(n: number): string` → `'Nenhum post' | '1 post' | 'N posts'`
  - `teacherCountLabel(n: number): string` → `'1 professor cadastrado' | 'N professores cadastrados'`
  - `authorSubtitle(a: Pick<AuthorSummary, 'postCount' | 'createdAt'>): string`
  - `avatarColor(index: number): string`
  - `blockedCount(fromApi: number | null, fromList: number): number`

Observação: o spec cita `removalBlockedMessage`. O sheet bloqueado mostra o número em negrito no meio da frase, então monta o texto com `postCountLabel` e a função separada sai do plano.

- [ ] **Step 1: Testes que falham**

Acrescente em `src/lib/formatDate.test.ts` (troque o import por `import { formatDate, formatMonthYear } from './formatDate';`):

```ts
describe('formatMonthYear', () => {
  it('mês curto e ano', () => {
    expect(formatMonthYear('2026-03-15T12:00:00.000Z')).toBe('mar 2026');
  });
  it('vazio para data inválida', () => {
    expect(formatMonthYear('')).toBe('');
    expect(formatMonthYear('xx')).toBe('');
  });
});
```

Crie `src/lib/admin.test.ts`:

```ts
import type { SessionUser } from '@/api/types';
import { CATEGORIES } from '@/theme';
import {
  authorSubtitle,
  avatarColor,
  blockedCount,
  homeRouteFor,
  isAdmin,
  postCountLabel,
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/lib`
Expected: FAIL (`formatMonthYear` não exportado, `./admin` não existe).

- [ ] **Step 3: `formatMonthYear`**

Acrescente ao fim de `src/lib/formatDate.ts`:

```ts
export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
```

- [ ] **Step 4: `src/lib/admin.ts`**

```ts
import type { AuthorSummary, SessionUser } from '@/api/types';
import { CATEGORIES } from '@/theme';
import { formatMonthYear } from './formatDate';

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'ADMIN';
}

/** Para onde vai quem acabou de entrar. */
export function homeRouteFor(user: SessionUser | null): '/admin' | '/' {
  return isAdmin(user) ? '/admin' : '/';
}

export function postCountLabel(n: number): string {
  if (n <= 0) return 'Nenhum post';
  return n === 1 ? '1 post' : `${n} posts`;
}

export function teacherCountLabel(n: number): string {
  return n === 1 ? '1 professor cadastrado' : `${n} professores cadastrados`;
}

export function authorSubtitle(a: Pick<AuthorSummary, 'postCount' | 'createdAt'>): string {
  const since = formatMonthYear(a.createdAt);
  const count = postCountLabel(a.postCount);
  return since ? `${count} · desde ${since}` : count;
}

// Cores das matérias, sem o cinza de "Geral" (último item).
const AVATAR_COLORS = CATEGORIES.slice(0, -1).map((c) => c.color);

export function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** Quantos posts mostrar no sheet bloqueado depois de um 409. */
export function blockedCount(fromApi: number | null, fromList: number): number {
  return fromApi ?? Math.max(fromList, 1);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest src/lib && npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat: regras e rótulos da área de admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Estado da lista de professores (`useAuthors`)

**Files:**
- Create: `src/hooks/authorsState.ts`, `src/hooks/authorsState.test.ts`, `src/hooks/useAuthors.ts`

**Interfaces:**
- Consumes: `listAuthors()` (Task 1), `createLatest()` (`@/lib/latest`, devolve uma função `latest(promise)` → `Promise<{ stale: false; value } | { stale: true }>`).
- Produces:
  - `useAuthors(): { status: 'loading' | 'success' | 'error'; authors: AuthorSummary[]; error: string | null; refreshing: boolean; reload(opts?: { pull?: boolean }): void }`

- [ ] **Step 1: Teste que falha**

`src/hooks/authorsState.test.ts`:

```ts
import type { AuthorSummary } from '@/api/types';
import { authorsReducer, initialAuthorsState } from './authorsState';

const ana: AuthorSummary = {
  id: 'a1',
  name: 'Ana',
  userId: 'u1',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
  postCount: 2,
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/hooks/authorsState`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementação**

`src/hooks/authorsState.ts`:

```ts
import type { AuthorSummary } from '@/api/types';

export type AuthorsState = {
  status: 'loading' | 'success' | 'error';
  authors: AuthorSummary[];
  error: string | null;
  refreshing: boolean;
};

export type AuthorsAction =
  | { type: 'request'; pull: boolean }
  | { type: 'success'; authors: AuthorSummary[] }
  | { type: 'failure'; message: string };

export const initialAuthorsState: AuthorsState = { status: 'loading', authors: [], error: null, refreshing: false };

export function authorsReducer(state: AuthorsState, action: AuthorsAction): AuthorsState {
  switch (action.type) {
    case 'request':
      return action.pull ? { ...state, refreshing: true } : { ...state, status: 'loading' };
    case 'success':
      return { status: 'success', authors: action.authors, error: null, refreshing: false };
    case 'failure':
      return { ...state, status: 'error', error: action.message, refreshing: false };
  }
}
```

`src/hooks/useAuthors.ts`:

```ts
import { useCallback, useReducer, useState } from 'react';

import { listAuthors } from '@/api/authors';
import { ApiError } from '@/api/client';
import { createLatest } from '@/lib/latest';
import { authorsReducer, initialAuthorsState } from './authorsState';

export function useAuthors() {
  const [latest] = useState(createLatest);
  const [state, dispatch] = useReducer(authorsReducer, initialAuthorsState);

  const reload = useCallback(
    (opts?: { pull?: boolean }) => {
      dispatch({ type: 'request', pull: !!opts?.pull });
      latest(listAuthors())
        .then((res) => {
          if (res.stale) return;
          dispatch({ type: 'success', authors: res.value });
        })
        .catch((err: unknown) => {
          dispatch({ type: 'failure', message: err instanceof ApiError ? err.message : 'Algo deu errado.' });
        });
    },
    [latest],
  );

  return { ...state, reload };
}
```

Antes de seguir, abra `src/lib/latest.ts` e confira que `createLatest()` devolve a função `latest(promise)` com esse formato (o `usePosts` usa igual).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/hooks && npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks
git commit -m "feat: estado da lista de professores

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Tema e componentes da área de admin

**Files:**
- Modify: `src/theme.ts` (`colors`), `src/components/PrimaryButton.tsx`, `src/components/ConfirmSheet.tsx`
- Create: `src/components/AuthorRow.tsx`, `src/components/AuthorActionsSheet.tsx`, `src/components/RemoveAuthorSheet.tsx`, `src/components/ModalForm.tsx`

**Interfaces:**
- Consumes: `AuthorSummary`; `authorSubtitle`, `avatarColor`, `postCountLabel` (Task 2); `initials` (`@/lib/initials`).
- Produces:
  - `colors.admin: '#C3A6FF'`
  - `PrimaryButton` prop `tone?: 'accent' | 'danger' | 'admin'`
  - `ConfirmSheet` props: `{ visible; title; message?: string; children?: ReactNode; confirmLabel?: string; onConfirm?: () => void; cancelLabel?: string; onCancel; loading? }`. Sem `confirmLabel`/`onConfirm`, o sheet não mostra o botão vermelho. O fundo não fecha o sheet enquanto `loading`.
  - `AuthorRow({ author: AuthorSummary; index: number; onPress: () => void })`
  - `AuthorActionsSheet({ author: AuthorSummary | null; onRename: () => void; onRemove: () => void; onClose: () => void })`
  - `RemoveAuthorSheet({ author: AuthorSummary | null; postCount: number; loading: boolean; onConfirm: () => void; onClose: () => void })`
  - `ModalForm({ title: string; error: string | null; onClose: () => void; children: ReactNode })`: casca com ✕, título, aviso de erro no topo, teclado e rolagem.

Esta task não tem teste unitário (só UI). A verificação é typecheck, lint e a exportação do bundle no fim da Task 6.

- [ ] **Step 1: Cor da área**

Em `src/theme.ts`, dentro de `colors`, depois de `success`:

```ts
  admin: '#C3A6FF',
```

- [ ] **Step 2: `PrimaryButton` com tom admin**

Em `src/components/PrimaryButton.tsx`, troque `tone?: 'accent' | 'danger';` por `tone?: 'accent' | 'danger' | 'admin';`. Troque a linha do `backgroundColor` por:

```tsx
        { backgroundColor: TONES[tone] },
```

E, abaixo dos imports, acrescente:

```tsx
const TONES = { accent: colors.accent, danger: colors.danger, admin: colors.admin } as const;
```

- [ ] **Step 3: `ConfirmSheet` com conteúdo customizado**

Substitua `src/components/ConfirmSheet.tsx` inteiro:

```tsx
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/theme';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  /** Sem confirmLabel/onConfirm o sheet só tem o botão de fechar. */
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
  onCancel: () => void;
  loading?: boolean;
};

export function ConfirmSheet({
  visible,
  title,
  message,
  children,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancelar',
  onCancel,
  loading,
}: Props) {
  const insets = useSafeAreaInsets();
  const close = () => {
    if (!loading) onCancel();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.dim} onPress={close} accessibilityLabel="Fechar" />
      <View style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {children}
        {confirmLabel && onConfirm ? (
          <PrimaryButton label={confirmLabel} onPress={onConfirm} loading={loading} tone="danger" />
        ) : null}
        <Pressable onPress={close} style={styles.cancel} accessibilityRole="button" disabled={loading}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    padding: 18,
  },
  title: { fontFamily: fonts.display800, fontSize: 20, color: colors.text, marginBottom: 6 },
  message: { fontFamily: fonts.body400, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginBottom: 18 },
  cancel: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.pill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: { fontFamily: fonts.display800, fontSize: 15, color: colors.text },
});
```

A tela de post (`src/app/post/[id]/index.tsx`) continua funcionando sem mudança: ela passa `message`, `confirmLabel` e `onConfirm`.

- [ ] **Step 4: `AuthorRow`**

`src/components/AuthorRow.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AuthorSummary } from '@/api/types';
import { authorSubtitle, avatarColor } from '@/lib/admin';
import { initials } from '@/lib/initials';
import { colors, fonts, space } from '@/theme';

type Props = { author: AuthorSummary; index: number; onPress: () => void };

export function AuthorRow({ author, index, onPress }: Props) {
  const subtitle = authorSubtitle(author);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={`${author.name}, ${subtitle}. Abrir ações`}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor(index) }]}>
        <Text style={styles.avatarText}>{initials(author.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {author.name}
        </Text>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>
      <Text style={styles.more}>⋯</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingVertical: space.md,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display800, fontSize: 14, color: colors.onCard },
  info: { flex: 1 },
  name: { fontFamily: fonts.display700, fontSize: 16, color: colors.text },
  sub: { fontFamily: fonts.body400, fontSize: 12, color: colors.textFaint, marginTop: 2 },
  more: { fontSize: 18, color: colors.textFaint },
});
```

- [ ] **Step 5: `AuthorActionsSheet`**

`src/components/AuthorActionsSheet.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';

import type { AuthorSummary } from '@/api/types';
import { authorSubtitle } from '@/lib/admin';
import { colors, fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  author: AuthorSummary | null;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export function AuthorActionsSheet({ author, onRename, onRemove, onClose }: Props) {
  return (
    <ConfirmSheet visible={!!author} title={author?.name ?? ''} onCancel={onClose}>
      <Text style={styles.sub}>{author ? authorSubtitle(author) : ''}</Text>
      <Pressable style={styles.opt} onPress={onRename} accessibilityRole="button">
        <Text style={styles.optText}>✎ Renomear</Text>
      </Pressable>
      <Pressable style={[styles.opt, styles.last]} onPress={onRemove} accessibilityRole="button">
        <Text style={[styles.optText, { color: colors.danger }]}>🗑 Remover professor</Text>
      </Pressable>
    </ConfirmSheet>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.body400, fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  opt: { paddingVertical: 14, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  last: { borderBottomWidth: 0, marginBottom: 4 },
  optText: { fontFamily: fonts.display700, fontSize: 15, color: colors.text },
});
```

- [ ] **Step 6: `RemoveAuthorSheet`**

`src/components/RemoveAuthorSheet.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import type { AuthorSummary } from '@/api/types';
import { postCountLabel } from '@/lib/admin';
import { fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  author: AuthorSummary | null;
  /** Posts que bloqueiam a remoção (da lista ou do 409). 0 = pode remover. */
  postCount: number;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function RemoveAuthorSheet({ author, postCount, loading, onConfirm, onClose }: Props) {
  const title = `Remover ${author?.name ?? ''}?`;
  if (postCount > 0) {
    return (
      <ConfirmSheet visible={!!author} title={title} cancelLabel="Entendi" onCancel={onClose}>
        <View style={styles.warn} accessibilityRole="alert">
          <Text style={styles.warnText}>
            Esta pessoa tem <Text style={styles.bold}>{postCountLabel(postCount)}</Text>. Exclua ou transfira os posts
            antes de removê-la.
          </Text>
        </View>
      </ConfirmSheet>
    );
  }
  return (
    <ConfirmSheet
      visible={!!author}
      title={title}
      message="A conta de login dele também será apagada. Não dá para desfazer."
      confirmLabel="Remover professor"
      onConfirm={onConfirm}
      onCancel={onClose}
      loading={loading}
    />
  );
}

const styles = StyleSheet.create({
  warn: {
    backgroundColor: 'rgba(255,179,107,0.15)',
    borderWidth: 1.5,
    borderColor: '#FFB36B',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  warnText: { fontFamily: fonts.body400, fontSize: 13, lineHeight: 19, color: '#FFD7AE' },
  bold: { fontFamily: fonts.body700 },
});
```

- [ ] **Step 7: `ModalForm`**

`src/components/ModalForm.tsx`:

```tsx
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, space } from '@/theme';
import { IconButton } from './IconButton';

type Props = { title: string; error: string | null; onClose: () => void; children: ReactNode };

export function ModalForm({ title, error, onClose, children }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.nav}>
            <IconButton label="✕" onPress={onClose} accessibilityLabel="Fechar" />
            <Text style={styles.navTitle} accessibilityRole="header">
              {title}
            </Text>
            <View style={styles.navSpacer} />
          </View>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: 40 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  navTitle: { fontFamily: fonts.display700, fontSize: 16, color: colors.text },
  navSpacer: { width: 40 },
  error: { fontFamily: fonts.body500, fontSize: 13, color: colors.danger, marginBottom: 12 },
});
```

- [ ] **Step 8: Verificar**

Run: `npm test && npx tsc --noEmit && npx expo lint`
Expected: PASS (testes existentes inalterados, sem erros de tipo/lint).

- [ ] **Step 9: Commit**

```bash
git add src/theme.ts src/components
git commit -m "feat: componentes da área de admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Erro de formulário reaproveitável

**Files:**
- Create: `src/lib/formError.ts`, `src/lib/formError.test.ts`

**Interfaces:**
- Consumes: `ApiError` (Task 1).
- Produces: `toFormError(err: unknown): { error: string | null; fieldErrors: Record<string, string[]> }`

- [ ] **Step 1: Teste que falha**

`src/lib/formError.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { toFormError } from './formError';

describe('toFormError', () => {
  it('erros de campo vão para os campos, sem aviso no topo', () => {
    const err = new ApiError(400, 'Confira os campos destacados.', { email: ['Informe um e-mail válido.'] });
    expect(toFormError(err)).toEqual({ error: null, fieldErrors: { email: ['Informe um e-mail válido.'] } });
  });
  it('erro geral da API vai para o topo', () => {
    expect(toFormError(new ApiError(409, 'Já existe uma conta com esse e-mail.'))).toEqual({
      error: 'Já existe uma conta com esse e-mail.',
      fieldErrors: {},
    });
  });
  it('erro desconhecido vira mensagem genérica', () => {
    expect(toFormError(new Error('x'))).toEqual({ error: 'Algo deu errado. Tente de novo.', fieldErrors: {} });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/lib/formError`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementação**

`src/lib/formError.ts`:

```ts
import { ApiError } from '@/api/client';

export type FormError = { error: string | null; fieldErrors: Record<string, string[]> };

export function toFormError(err: unknown): FormError {
  if (err instanceof ApiError) {
    return err.fieldErrors ? { error: null, fieldErrors: err.fieldErrors } : { error: err.message, fieldErrors: {} };
  }
  return { error: 'Algo deu errado. Tente de novo.', fieldErrors: {} };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/lib && npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/formError.ts src/lib/formError.test.ts
git commit -m "feat: conversão de erro da API para formulário

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Rotas protegidas e Painel

**Files:**
- Modify: `src/app/_layout.tsx`
- Create: `src/app/admin/index.tsx`, `src/app/admin/novo.tsx`, `src/app/admin/[id]/renomear.tsx`

**Interfaces:**
- Consumes: `useAuthors` (Task 3); `deleteAuthor`, `createAuthor`, `renameAuthor`, `AuthorHasPostsError` (Task 1); `isAdmin`, `teacherCountLabel`, `blockedCount` (Task 2); `AuthorRow`, `AuthorActionsSheet`, `RemoveAuthorSheet`, `ModalForm`, `PrimaryButton tone="admin"` (Task 4); `toFormError` (Task 5); `useRequireToken`, `useHandleApiError`.
- Produces: rotas `/admin`, `/admin/novo`, `/admin/[id]/renomear` (params `id`, `name`). O Painel lê o parâmetro `aviso` para o toast.

- [ ] **Step 1: Layout com `Stack.Protected`**

Antes de editar, confirme na doc da versão (`https://docs.expo.dev/versions/v57.0.0/sdk/router/`, seção "Protected routes") que `Stack.Protected` aceita `guard` no SDK 57.

Em `src/app/_layout.tsx`: troque `const { ready } = useAuth();` por `const { ready, user } = useAuth();`, acrescente o import `import { isAdmin } from '@/lib/admin';`, e troque o bloco `<Stack ...>...</Stack>` por:

```tsx
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post/novo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post/[id]/index" />
        <Stack.Screen name="post/[id]/editar" options={{ presentation: 'modal' }} />
        <Stack.Protected guard={isAdmin(user)}>
          <Stack.Screen name="admin/index" />
          <Stack.Screen name="admin/novo" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin/[id]/renomear" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
```

- [ ] **Step 2: Painel**

`src/app/admin/index.tsx`:

```tsx
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactElement } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthorHasPostsError, deleteAuthor } from '@/api/authors';
import { ApiError } from '@/api/client';
import type { AuthorSummary } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { AuthorActionsSheet } from '@/components/AuthorActionsSheet';
import { AuthorRow } from '@/components/AuthorRow';
import { RemoveAuthorSheet } from '@/components/RemoveAuthorSheet';
import { SkeletonCard } from '@/components/SkeletonCard';
import { StateMessage } from '@/components/StateMessage';
import { Toast } from '@/components/Toast';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { useAuthors } from '@/hooks/useAuthors';
import { blockedCount, teacherCountLabel } from '@/lib/admin';
import { initials } from '@/lib/initials';
import { colors, fonts, radius, space } from '@/theme';

type Removing = { author: AuthorSummary; postCount: number };

export default function AdminPanel() {
  const { user, signOut } = useAuth();
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  const insets = useSafeAreaInsets();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const { status, authors, error, refreshing, reload } = useAuthors();
  const [selected, setSelected] = useState<AuthorSummary | null>(null);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const hideToast = useCallback(() => {
    router.setParams({ aviso: undefined });
  }, []);

  function onAccountPress() {
    if (!user) return;
    Alert.alert(user.name, 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  function openRename() {
    if (!selected) return;
    const { id, name } = selected;
    setSelected(null);
    router.push({ pathname: '/admin/[id]/renomear', params: { id, name } });
  }

  function openRemove() {
    if (!selected) return;
    setRemoving({ author: selected, postCount: selected.postCount });
    setSelected(null);
  }

  async function confirmRemove() {
    if (!removing) return;
    const token = requireToken();
    if (!token) {
      setRemoving(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteAuthor(removing.author.id, token);
      setRemoving(null);
      router.setParams({ aviso: 'Professor removido' });
      reload();
    } catch (err) {
      if (err instanceof AuthorHasPostsError) {
        // Alguém publicou nesse meio-tempo: troca para a versão bloqueada.
        setRemoving({ author: removing.author, postCount: blockedCount(err.postCount, removing.author.postCount) });
        reload();
        return;
      }
      setRemoving(null);
      if (handleApiError(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Professor não encontrado', 'Ele pode já ter sido removido.');
        reload();
        return;
      }
      Alert.alert('Não foi possível remover', err instanceof ApiError ? err.message : 'Tente de novo.');
    } finally {
      setDeleting(false);
    }
  }

  const header = (
    <View>
      <View style={styles.top}>
        <Pressable onPress={() => router.push('/')} style={styles.pill} accessibilityRole="button">
          <Text style={styles.pillText}>📚 Ver posts</Text>
        </Pressable>
        <Pressable
          onPress={onAccountPress}
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel={user ? `Conta de ${user.name}` : 'Conta'}
        >
          <Text style={styles.avatarText}>{initials(user?.name)}</Text>
        </Pressable>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Administração</Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Professores
      </Text>
      {status === 'success' && authors.length > 0 && (
        <Text style={styles.sub}>{teacherCountLabel(authors.length)}</Text>
      )}
    </View>
  );

  let empty: ReactElement;
  if (status === 'loading') {
    empty = (
      <View>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  } else if (status === 'error') {
    empty = (
      <StateMessage
        emoji="📡"
        title="Sem conexão com o servidor"
        message={error ?? 'Não conseguimos carregar os professores.'}
        actionLabel="Tentar de novo"
        onAction={() => reload()}
      />
    );
  } else {
    empty = (
      <StateMessage emoji="🧑‍🏫" title="Nenhum professor cadastrado" message="Cadastre o primeiro pelo botão abaixo." />
    );
  }

  const showList = status === 'success' || (status === 'loading' && authors.length > 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={showList ? authors : []}
        keyExtractor={(a) => a.id}
        renderItem={({ item, index }) => <AuthorRow author={item} index={index} onPress={() => setSelected(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => reload({ pull: true })} tintColor={colors.text} />
        }
      />
      <Pressable
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => router.push('/admin/novo')}
        accessibilityRole="button"
        accessibilityLabel="Cadastrar professor"
      >
        <Text style={styles.fabText}>＋ Professor</Text>
      </Pressable>
      <AuthorActionsSheet
        author={selected}
        onRename={openRename}
        onRemove={openRemove}
        onClose={() => setSelected(null)}
      />
      <RemoveAuthorSheet
        author={removing?.author ?? null}
        postCount={removing?.postCount ?? 0}
        loading={deleting}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
      <Toast message={aviso ?? null} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, marginBottom: 8 },
  pill: { backgroundColor: colors.subtle, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { fontFamily: fonts.display700, fontSize: 13, color: colors.text },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display700, fontSize: 13, color: colors.onCard },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.admin,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: { fontFamily: fonts.display700, fontSize: 11, color: colors.onCard },
  title: { fontFamily: fonts.display800, fontSize: 30, lineHeight: 32, color: colors.text, marginBottom: 4 },
  sub: { fontFamily: fonts.body400, fontSize: 12, color: colors.textFaint, marginBottom: 14 },
  fab: {
    position: 'absolute',
    right: 18,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.admin,
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  fabText: { fontFamily: fonts.display800, fontSize: 15, color: colors.onCard },
});
```

Observação: o subtítulo só aparece com a lista carregada e não vazia. No estado vazio, a mensagem "Nenhum professor cadastrado" já informa a contagem.

- [ ] **Step 3: Cadastrar**

`src/app/admin/novo.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { createAuthor } from '@/api/authors';
import type { AuthorInput } from '@/api/types';
import { Field } from '@/components/Field';
import { ModalForm } from '@/components/ModalForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { toFormError, type FormError } from '@/lib/formError';
import { colors, fonts } from '@/theme';

const NO_ERROR: FormError = { error: null, fieldErrors: {} };

export default function NewAuthor() {
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const [values, setValues] = useState<AuthorInput>({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError>(NO_ERROR);

  async function submit() {
    const token = requireToken();
    if (!token) return;
    setSaving(true);
    setFormError(NO_ERROR);
    try {
      await createAuthor({ name: values.name.trim(), email: values.email.trim(), password: values.password }, token);
      router.dismissTo({ pathname: '/admin', params: { aviso: 'Professor cadastrado' } });
    } catch (err) {
      if (!handleApiError(err)) setFormError(toFormError(err));
    } finally {
      setSaving(false);
    }
  }

  const fe = formError.fieldErrors;
  return (
    <ModalForm title="Novo professor" error={formError.error} onClose={() => router.back()}>
      <Field
        label="Nome"
        value={values.name}
        onChangeText={(t) => setValues((v) => ({ ...v, name: t }))}
        autoCapitalize="words"
        textContentType="name"
        error={fe.name?.[0]}
      />
      <Field
        label="E-mail"
        value={values.email}
        onChangeText={(t) => setValues((v) => ({ ...v, email: t }))}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        error={fe.email?.[0]}
      />
      <Field
        label="Senha inicial"
        value={values.password}
        onChangeText={(t) => setValues((v) => ({ ...v, password: t }))}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        error={fe.password?.[0]}
      />
      <Text style={styles.hint}>
        Mínimo de 8 caracteres. Passe a senha para o professor, que entra com ela no app e no site.
      </Text>
      <PrimaryButton label="Cadastrar" onPress={submit} loading={saving} tone="admin" />
    </ModalForm>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body400, fontSize: 12, lineHeight: 17, color: colors.textFaint, marginTop: -6, marginBottom: 20 },
});
```

- [ ] **Step 4: Renomear**

`src/app/admin/[id]/renomear.tsx`:

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { renameAuthor } from '@/api/authors';
import { ApiError } from '@/api/client';
import { Field } from '@/components/Field';
import { ModalForm } from '@/components/ModalForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { toFormError, type FormError } from '@/lib/formError';
import { colors, fonts } from '@/theme';

const NO_ERROR: FormError = { error: null, fieldErrors: {} };

export default function RenameAuthor() {
  const { id, name: current } = useLocalSearchParams<{ id: string; name?: string }>();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const [name, setName] = useState(current ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError>(NO_ERROR);

  async function submit() {
    const token = requireToken();
    if (!token) return;
    setSaving(true);
    setFormError(NO_ERROR);
    try {
      await renameAuthor(id, name.trim(), token);
      router.dismissTo({ pathname: '/admin', params: { aviso: 'Nome atualizado' } });
    } catch (err) {
      if (handleApiError(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Professor não encontrado', 'Ele pode ter sido removido.');
        router.dismissTo('/admin');
        return;
      }
      setFormError(toFormError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalForm title="Renomear" error={formError.error} onClose={() => router.back()}>
      <Field
        label="Nome"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoFocus
        onSubmitEditing={submit}
        error={formError.fieldErrors.name?.[0]}
      />
      <Text style={styles.hint}>O novo nome aparece em todos os posts dessa pessoa.</Text>
      <PrimaryButton label="Salvar" onPress={submit} loading={saving} tone="admin" />
    </ModalForm>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body400, fontSize: 12, lineHeight: 17, color: colors.textFaint, marginTop: -6, marginBottom: 20 },
});
```

- [ ] **Step 5: Regerar os tipos das rotas**

As rotas tipadas só são regeradas quando o `expo start` roda. Rode:

Run: `CI=1 timeout 60 npx expo start --offline; npx tsc --noEmit`
Expected: o `expo start` encerra pelo timeout. Depois disso, o `tsc` passa sem erro de `Href` em `/admin`, `/admin/novo` e `/admin/[id]/renomear`.

- [ ] **Step 6: Verificar tudo e o bundle**

Run: `npm test && npx expo lint && npx expo export --platform android --output-dir "$TEMP/tc4-export"`
Expected: testes passam, lint limpo, export termina com "Exported".

- [ ] **Step 7: Commit**

```bash
git add src/app
git commit -m "feat: painel de professores com cadastro, renomear e remover

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Navegação por papel

**Files:**
- Modify: `src/auth/AuthContext.tsx`, `src/app/login.tsx`, `src/app/_layout.tsx`, `src/app/index.tsx`

**Interfaces:**
- Consumes: `homeRouteFor`, `isAdmin` (Task 2); rota `/admin` (Task 6).
- Produces: `signIn(email, password): Promise<SessionUser>`.

Por que a navegação fica num efeito: `router.dismissTo('/admin')` logo depois do `await signIn()` pode rodar antes do layout re-renderizar com o usuário novo. Nesse caso o guard ainda está `false` e o Expo Router manda para `/`. O efeito roda depois do render em que `user` já mudou, e o guard já está `true` nesse momento.

- [ ] **Step 1: `signIn` devolve o usuário**

Em `src/auth/AuthContext.tsx`, no tipo `AuthValue`, troque `signIn(email: string, password: string): Promise<void>;` por `signIn(email: string, password: string): Promise<SessionUser>;`. No `signIn` do provider, acrescente `return res.user;` como última linha do callback (depois do `await saveRaw(...)`).

- [ ] **Step 2: Login decide o destino**

Em `src/app/login.tsx`:
- imports: troque `import { useState } from 'react';` por `import { useEffect, useState } from 'react';`. Acrescente `import type { SessionUser } from '@/api/types';` e `import { homeRouteFor } from '@/lib/admin';`.
- troque `const { signIn } = useAuth();` por:

```tsx
  const { signIn, user } = useAuth();
  const [signedIn, setSignedIn] = useState<SessionUser | null>(null);

  // Navega só depois que o contexto já tem o usuário novo (o guard do /admin depende dele).
  useEffect(() => {
    if (!signedIn || user?.id !== signedIn.id) return;
    if (homeRouteFor(signedIn) === '/admin') router.dismissTo('/admin');
    else router.back();
  }, [signedIn, user]);
```

- no `submit`, troque as duas linhas `await signIn(email, password);` e `router.back();` por:

```tsx
      setSignedIn(await signIn(email, password));
```

- [ ] **Step 3: Redirecionamento ao abrir o app logado como admin**

Em `src/app/_layout.tsx`:
- imports: troque `import { Stack } from 'expo-router';` por `import { router, Stack, useRootNavigationState } from 'expo-router';` e `import { useEffect } from 'react';` por `import { useEffect, useRef } from 'react';`.
- dentro de `RootStack`, logo depois do `useEffect` que esconde o splash, acrescente:

```tsx
  const navReady = !!useRootNavigationState()?.key;
  const startChecked = useRef(false);

  // Só na abertura do app: admin já logado começa no Painel.
  useEffect(() => {
    if (!done || !navReady || startChecked.current) return;
    startChecked.current = true;
    if (isAdmin(user)) router.replace('/admin');
  }, [done, navReady, user]);
```

Antes de editar, confirme na doc do SDK 57 (`https://docs.expo.dev/versions/v57.0.0/sdk/router/`) que `useRootNavigationState` existe. Se não existir, remova `navReady` e use só `done`. O efeito do layout roda depois dos efeitos do `Stack` filho, então o navegador já está montado.

- [ ] **Step 4: Opção "Painel" na lista de posts**

Em `src/app/index.tsx`, acrescente o import `import { isAdmin } from '@/lib/admin';` e troque o `Alert.alert(...)` de `onAccountPress` por:

```tsx
    Alert.alert(user.name, 'Deseja sair da conta?', [
      ...(isAdmin(user) ? [{ text: 'Painel', onPress: () => router.dismissTo('/admin') }] : []),
      { text: 'Cancelar', style: 'cancel' as const },
      { text: 'Sair', style: 'destructive' as const, onPress: () => signOut() },
    ]);
```

- [ ] **Step 5: Verificar**

Run: `npm test && npx tsc --noEmit && npx expo lint && npx expo export --platform android --output-dir "$TEMP/tc4-export"`
Expected: tudo passa; export "Exported".

- [ ] **Step 6: Commit**

```bash
git add src/auth/AuthContext.tsx src/app
git commit -m "feat: admin entra direto no Painel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: README e checagem final

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Documentar a área de admin**

Em `README.md`, acrescente uma seção `## Área de administração` depois da seção que descreve as telas/funcionalidades. Conteúdo:

```markdown
## Área de administração

Quem entra com uma conta **ADMIN** vai direto para o **Painel** (`/admin`), onde lista, cadastra, renomeia e remove professores. Aluno e professor não conseguem abrir o Painel: o app manda de volta para a lista de posts.

- **Ver posts** abre a lista normal. Lá, o botão com as iniciais tem a opção **Painel** para voltar.
- Professor com posts não pode ser removido. Exclua ou transfira os posts antes.
- Remover um professor apaga também a conta de login dele.

Depende dos ajustes da API do Tech Challenge 3: `postCount` em `GET /api/author`, 409 em `DELETE /api/author/:id` quando há posts, e 401 (sem sessão) / 403 (sem permissão) nas rotas de escrita.
```

- [ ] **Step 2: Checagem completa**

Run: `npm test && npx tsc --noEmit && npx expo lint && npx expo-doctor`
Expected: tudo passa.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: área de administração no README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Roteiro manual (Expo Go, com a API rodando)**

Passe ao usuário para executar: login como admin abre o Painel; reabrir o app logado abre o Painel; "Ver posts" e voltar pelo menu "Painel"; cadastrar com e-mail inválido, senha curta e e-mail repetido; cadastrar certo (toast "Professor cadastrado"); renomear (toast "Nome atualizado"); remover professor sem posts (toast "Professor removido"); tentar remover professor com posts (sheet bloqueado); sair da conta estando no Painel (volta para a lista).
