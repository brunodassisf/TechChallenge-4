# Desativar professor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O ADMIN desativa e reativa professores pelo Painel; inativos aparecem apagados no fim da lista.

**Architecture:** `AuthorSummary` ganha `active`, normalizado na camada HTTP (`src/api/authors.ts`), que também ganha `setAuthorActive`. Regras puras em `src/lib/admin.ts` (`sortAuthors`, `authorActions`, `teacherCountLabel` com inativos). Componentes do Painel recebem as ações novas, e o Painel concentra as chamadas e os avisos.

**Tech Stack:** Expo SDK 57, Expo Router 57, React 19, TypeScript 6, Jest (`jest-expo`), `StyleSheet` + `src/theme.ts`.

**Spec:** `docs/superpowers/specs/2026-11-05-desativar-professor-design.md`

## Global Constraints

- Textos exatamente como no spec: "Inativo", "Desativar professor", "Reativar professor", "Professor desativado", "Professor reativado", "Desativar {nome}?", "A pessoa não consegue mais entrar no app nem no site. Os posts continuam publicados. Dá para reativar depois.", "Desative o professor para manter os posts publicados."
- Chamadas autenticadas passam por `useRequireToken()` e `useHandleApiError()`.
- Antes de cada commit: `npm test`, `npx tsc --noEmit`, `npx expo lint` passam.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **API antiga sem `active`**: todos aparecem como ativos e nada quebra. Teste em `authors.test.ts` (Task 1).
2. **Resposta do PATCH sem `postCount`/`active`**: `setAuthorActive` normaliza do mesmo jeito que a lista. Teste em `authors.test.ts` (Task 1).
3. **Ordem estável**: dentro de ativos e de inativos, a ordem alfabética da API se mantém. Teste de `sortAuthors` (Task 2).
4. **Plural de inativos**: "· 1 inativo" / "· 2 inativos", e nada quando não há inativos. Teste de `teacherCountLabel` (Task 2).
5. **Toque duplo em Desativar**: o botão fica em carregamento e o fundo não fecha o sheet enquanto a chamada roda (`ConfirmSheet` já trata `loading`). Sem teste unitário; vai para o roteiro manual.

---

### Task 1: `active` e `setAuthorActive` na camada HTTP

**Files:**
- Modify: `src/api/types.ts`, `src/api/authors.ts`
- Test: `src/api/authors.test.ts`

**Interfaces:**
- Produces:
  - `AuthorSummary` ganha `active: boolean`.
  - `setAuthorActive(id: string, active: boolean, token: string): Promise<AuthorSummary>` (`PATCH /api/author/:id/status`).
  - `listAuthors`, `createAuthor`, `renameAuthor` passam a devolver itens normalizados (`postCount` ausente → 0, `active` ausente → `true`).

- [ ] **Step 1: Testes que falham**

Em `src/api/authors.test.ts`:
- troque o import por `import { AuthorHasPostsError, deleteAuthor, listAuthors, setAuthorActive } from './authors';`
- no teste `'mantém postCount numérico'`, troque o `toEqual` por `toEqual([{ ...base, postCount: 4, active: true }])`;
- acrescente ao fim do `describe('listAuthors')`:

```ts
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
```

- acrescente ao fim do arquivo:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/api/authors`
Expected: FAIL (`setAuthorActive` não existe; `active` ausente).

- [ ] **Step 3: Tipo**

Em `src/api/types.ts`, dentro de `AuthorSummary`, depois de `postCount: number;`:

```ts
  /** false = conta de login desativada. */
  active: boolean;
```

- [ ] **Step 4: `method` aceita PATCH**

Em `src/api/client.ts`, troque `method?: 'GET' | 'POST' | 'PUT' | 'DELETE';` por `method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';`.

- [ ] **Step 5: Normalização e `setAuthorActive`**

Em `src/api/authors.ts`, troque `listAuthors`, `createAuthor` e `renameAuthor` por:

```ts
type RawAuthor = Omit<AuthorSummary, 'postCount' | 'active'> & { postCount?: unknown; active?: unknown };

// Antes dos ajustes no TC-3 a API não mandava postCount/active: 0 posts e ativo.
function normalizeAuthor(a: RawAuthor): AuthorSummary {
  return {
    ...a,
    postCount: typeof a.postCount === 'number' ? a.postCount : 0,
    active: typeof a.active === 'boolean' ? a.active : true,
  };
}

export async function listAuthors(): Promise<AuthorSummary[]> {
  const data = await apiRequest<unknown>('/api/author');
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  return (data as RawAuthor[]).map(normalizeAuthor);
}

export async function createAuthor(input: AuthorInput, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: RawAuthor }>('/api/author', { method: 'POST', body: input, token });
  return normalizeAuthor(res.data);
}

export async function renameAuthor(id: string, name: string, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: RawAuthor }>(`/api/author/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { name },
    token,
  });
  return normalizeAuthor(res.data);
}

export async function setAuthorActive(id: string, active: boolean, token: string): Promise<AuthorSummary> {
  const res = await apiRequest<{ data: RawAuthor }>(`/api/author/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { active },
    token,
  });
  return normalizeAuthor(res.data);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest src/api && npx tsc --noEmit && npx expo lint`
Expected: PASS. Se o `tsc` acusar `active` faltando em objetos `AuthorSummary` literais de outros testes (ex.: `src/hooks/authorsState.test.ts`), acrescente `active: true` neles.

- [ ] **Step 7: Commit**

```bash
git add src/api src/hooks
git commit -m "feat: status ativo/inativo na API de professores

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Regras de ordem, contagem e ações

**Files:**
- Modify: `src/lib/admin.ts`, `src/lib/admin.test.ts`

**Interfaces:**
- Consumes: `AuthorSummary` com `active` (Task 1).
- Produces:
  - `teacherCountLabel(total: number, inactive?: number): string`
  - `sortAuthors(list: AuthorSummary[]): AuthorSummary[]` (ativos primeiro, ordem estável, não muta a entrada)
  - `type AuthorAction = 'rename' | 'deactivate' | 'reactivate' | 'remove'`
  - `authorActions(a: Pick<AuthorSummary, 'active' | 'postCount'>): AuthorAction[]`

- [ ] **Step 1: Testes que falham**

Em `src/lib/admin.test.ts`, acrescente `authorActions` e `sortAuthors` ao import de `./admin`, e `import type { AuthorSummary, SessionUser } from '@/api/types';` no lugar do import de `SessionUser`. Acrescente ao fim:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/lib/admin`
Expected: FAIL (`sortAuthors`/`authorActions` não existem; rótulo sem inativos).

- [ ] **Step 3: Implementação**

Em `src/lib/admin.ts`, troque `teacherCountLabel` por:

```ts
export function teacherCountLabel(total: number, inactive = 0): string {
  const base = total === 1 ? '1 professor cadastrado' : `${total} professores cadastrados`;
  if (inactive <= 0) return base;
  return `${base} · ${inactive === 1 ? '1 inativo' : `${inactive} inativos`}`;
}
```

E acrescente ao fim:

```ts
/** Ativos primeiro; dentro de cada grupo, a ordem da API (alfabética). */
export function sortAuthors(list: AuthorSummary[]): AuthorSummary[] {
  return [...list.filter((a) => a.active), ...list.filter((a) => !a.active)];
}

export type AuthorAction = 'rename' | 'deactivate' | 'reactivate' | 'remove';

export function authorActions(a: Pick<AuthorSummary, 'active' | 'postCount'>): AuthorAction[] {
  const actions: AuthorAction[] = ['rename', a.active ? 'deactivate' : 'reactivate'];
  if (a.postCount === 0) actions.push('remove');
  return actions;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/lib && npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: regras de ordem e ações para professor inativo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Componentes com professor inativo

**Files:**
- Modify: `src/components/AuthorRow.tsx`, `src/components/AuthorActionsSheet.tsx`, `src/components/RemoveAuthorSheet.tsx`
- Create: `src/components/DeactivateAuthorSheet.tsx`

**Interfaces:**
- Consumes: `authorActions`, `AuthorAction` (Task 2); `AuthorSummary.active` (Task 1).
- Produces:
  - `AuthorActionsSheet({ author; onRename; onDeactivate; onReactivate; onRemove; onClose })` (todos `() => void`, exceto `author: AuthorSummary | null`)
  - `DeactivateAuthorSheet({ author: AuthorSummary | null; loading: boolean; onConfirm: () => void; onClose: () => void })`
  - `RemoveAuthorSheet` ganha `onDeactivate: () => void` (usado na versão bloqueada).

Sem teste unitário (só UI); verificação por typecheck, lint e export na Task 4.

- [ ] **Step 1: `AuthorRow` com inativo**

Em `src/components/AuthorRow.tsx`:
- no `style` do `Pressable`, troque por `style={({ pressed }) => [styles.row, !author.active && styles.inactive, pressed && { opacity: 0.8 }]}`;
- no `accessibilityLabel`, troque por ``accessibilityLabel={`${author.name}${author.active ? '' : ', inativo'}, ${subtitle}. Abrir ações`}``;
- troque o bloco do nome:

```tsx
        <Text style={styles.name} numberOfLines={1}>
          {author.name}
        </Text>
```

por:

```tsx
        <View style={styles.nameRow}>
          <Text style={[styles.name, styles.nameFlex]} numberOfLines={1}>
            {author.name}
          </Text>
          {!author.active && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Inativo</Text>
            </View>
          )}
        </View>
```

- acrescente aos estilos:

```ts
  inactive: { opacity: 0.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  nameFlex: { flexShrink: 1 },
  tag: { backgroundColor: colors.subtle, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: fonts.body700, fontSize: 10, color: colors.text },
```

- [ ] **Step 2: `AuthorActionsSheet` pelas ações**

Substitua `src/components/AuthorActionsSheet.tsx` inteiro:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';

import type { AuthorSummary } from '@/api/types';
import { authorActions, authorSubtitle, type AuthorAction } from '@/lib/admin';
import { colors, fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  author: AuthorSummary | null;
  onRename: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onClose: () => void;
};

const LABELS: Record<AuthorAction, string> = {
  rename: '✎ Renomear',
  deactivate: '⏸ Desativar professor',
  reactivate: '▶ Reativar professor',
  remove: '🗑 Remover professor',
};

const DANGER: readonly AuthorAction[] = ['deactivate', 'remove'];

export function AuthorActionsSheet({ author, onRename, onDeactivate, onReactivate, onRemove, onClose }: Props) {
  const handlers: Record<AuthorAction, () => void> = {
    rename: onRename,
    deactivate: onDeactivate,
    reactivate: onReactivate,
    remove: onRemove,
  };
  const actions = author ? authorActions(author) : [];
  return (
    <ConfirmSheet visible={!!author} title={author?.name ?? ''} onCancel={onClose}>
      <Text style={styles.sub}>{author ? authorSubtitle(author) : ''}</Text>
      {actions.map((action, i) => (
        <Pressable
          key={action}
          style={[styles.opt, i === actions.length - 1 && styles.last]}
          onPress={handlers[action]}
          accessibilityRole="button"
        >
          <Text style={[styles.optText, DANGER.includes(action) && { color: colors.danger }]}>{LABELS[action]}</Text>
        </Pressable>
      ))}
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

- [ ] **Step 3: `DeactivateAuthorSheet`**

`src/components/DeactivateAuthorSheet.tsx`:

```tsx
import type { AuthorSummary } from '@/api/types';
import { ConfirmSheet } from './ConfirmSheet';

type Props = { author: AuthorSummary | null; loading: boolean; onConfirm: () => void; onClose: () => void };

export function DeactivateAuthorSheet({ author, loading, onConfirm, onClose }: Props) {
  return (
    <ConfirmSheet
      visible={!!author}
      title={`Desativar ${author?.name ?? ''}?`}
      message="A pessoa não consegue mais entrar no app nem no site. Os posts continuam publicados. Dá para reativar depois."
      confirmLabel="Desativar professor"
      onConfirm={onConfirm}
      onCancel={onClose}
      loading={loading}
    />
  );
}
```

- [ ] **Step 4: Versão bloqueada da remoção oferece desativar**

Em `src/components/RemoveAuthorSheet.tsx`:
- no tipo `Props`, acrescente `onDeactivate: () => void;` e inclua `onDeactivate` na desestruturação;
- troque o bloco `if (postCount > 0) { ... }` por:

```tsx
  if (postCount > 0) {
    return (
      <ConfirmSheet
        visible={!!author}
        title={title}
        confirmLabel="Desativar professor"
        onConfirm={onDeactivate}
        onCancel={onClose}
        loading={loading}
      >
        <View style={styles.warn} accessibilityRole="alert">
          <Text style={styles.warnText}>
            Esta pessoa tem <Text style={styles.bold}>{postCountLabel(postCount)}</Text>. Desative o professor para
            manter os posts publicados.
          </Text>
        </View>
      </ConfirmSheet>
    );
  }
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit`
Expected: só erros em `src/app/admin/index.tsx` (props novas ainda não passadas); eles somem na Task 4. Os componentes em si não podem ter erro.

Esta task é commitada junto com a Task 4, porque o Painel quebra o typecheck até receber as props novas.

---

### Task 4: Painel com desativar e reativar

**Files:**
- Modify: `src/app/admin/index.tsx`

**Interfaces:**
- Consumes: `setAuthorActive` (Task 1); `sortAuthors`, `teacherCountLabel(total, inactive)` (Task 2); `AuthorActionsSheet`, `DeactivateAuthorSheet`, `RemoveAuthorSheet.onDeactivate` (Task 3).

- [ ] **Step 1: Imports e estado**

Em `src/app/admin/index.tsx`:
- troque `import { AuthorHasPostsError, deleteAuthor } from '@/api/authors';` por `import { AuthorHasPostsError, deleteAuthor, setAuthorActive } from '@/api/authors';`;
- acrescente `import { DeactivateAuthorSheet } from '@/components/DeactivateAuthorSheet';`;
- troque `import { blockedCount, teacherCountLabel } from '@/lib/admin';` por `import { blockedCount, sortAuthors, teacherCountLabel } from '@/lib/admin';`;
- troque `const [deleting, setDeleting] = useState(false);` por:

```tsx
  const [deactivating, setDeactivating] = useState<AuthorSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const sorted = sortAuthors(authors);
  const inactiveCount = authors.filter((a) => !a.active).length;
```

- [ ] **Step 2: Erros e troca de status**

Logo depois de `openRemove`, acrescente:

```tsx
  function openDeactivate() {
    if (!selected) return;
    setDeactivating(selected);
    setSelected(null);
  }

  function reactivateSelected() {
    if (!selected) return;
    const author = selected;
    setSelected(null);
    changeActive(author, true, () => {});
  }

  /** 401 → login; 404 → avisa e recarrega; resto → alerta com a mensagem da API. */
  function showError(err: unknown, title: string) {
    if (handleApiError(err)) return;
    if (err instanceof ApiError && err.status === 404) {
      Alert.alert('Professor não encontrado', 'Ele pode ter sido removido.');
      reload();
      return;
    }
    Alert.alert(title, err instanceof ApiError ? err.message : 'Tente de novo.');
  }

  async function changeActive(author: AuthorSummary, active: boolean, close: () => void) {
    const token = requireToken();
    if (!token) {
      close();
      return;
    }
    setBusy(true);
    try {
      await setAuthorActive(author.id, active, token);
      close();
      router.setParams({ aviso: active ? 'Professor reativado' : 'Professor desativado' });
      reload();
    } catch (err) {
      close();
      showError(err, active ? 'Não foi possível reativar' : 'Não foi possível desativar');
    } finally {
      setBusy(false);
    }
  }
```

- [ ] **Step 3: `confirmRemove` usa `busy` e `showError`**

Em `confirmRemove`, troque `setDeleting(true);` por `setBusy(true);` e `setDeleting(false);` por `setBusy(false);`. Troque o trecho depois de `setRemoving(null);` dentro do `catch`:

```tsx
      setRemoving(null);
      if (handleApiError(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Professor não encontrado', 'Ele pode já ter sido removido.');
        reload();
        return;
      }
      Alert.alert('Não foi possível remover', err instanceof ApiError ? err.message : 'Tente de novo.');
```

por:

```tsx
      setRemoving(null);
      showError(err, 'Não foi possível remover');
```

- [ ] **Step 4: Subtítulo e lista ordenada**

Troque:

```tsx
        <Text style={styles.sub}>{teacherCountLabel(authors.length)}</Text>
```

por:

```tsx
        <Text style={styles.sub}>{teacherCountLabel(authors.length, inactiveCount)}</Text>
```

E no `FlatList`, troque `data={showList ? authors : []}` por `data={showList ? sorted : []}`.

- [ ] **Step 5: Sheets**

Troque os elementos `<AuthorActionsSheet ... />` e `<RemoveAuthorSheet ... />` por:

```tsx
      <AuthorActionsSheet
        author={selected}
        onRename={openRename}
        onDeactivate={openDeactivate}
        onReactivate={reactivateSelected}
        onRemove={openRemove}
        onClose={() => setSelected(null)}
      />
      <DeactivateAuthorSheet
        author={deactivating}
        loading={busy}
        onConfirm={() => deactivating && changeActive(deactivating, false, () => setDeactivating(null))}
        onClose={() => setDeactivating(null)}
      />
      <RemoveAuthorSheet
        author={removing?.author ?? null}
        postCount={removing?.postCount ?? 0}
        loading={busy}
        onConfirm={confirmRemove}
        onDeactivate={() => removing && changeActive(removing.author, false, () => setRemoving(null))}
        onClose={() => setRemoving(null)}
      />
```

- [ ] **Step 6: Verificar tudo e o bundle**

Run: `npm test && npx tsc --noEmit && npx expo lint && npx expo export --platform android --output-dir "$TEMP/tc4-export"`
Expected: tudo passa; export "Exported".

- [ ] **Step 7: Commit (Tasks 3 e 4)**

```bash
git add src/components src/app/admin/index.tsx
git commit -m "feat: desativar e reativar professor no Painel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: README

**Files:**
- Modify: `README.md` (seção "Área de administração")

- [ ] **Step 1: Atualizar a seção**

Na seção `## Área de administração`, troque a linha `- Professor com posts não pode ser removido. Exclua ou transfira os posts antes.` por:

```markdown
- Professor pode ser **desativado**: não entra mais no app nem no site, e os posts dele continuam publicados. Dá para **reativar** depois. No Painel, inativos aparecem apagados, no fim da lista.
- **Remover** só aparece para quem não tem posts.
```

E acrescente ao parágrafo "Depende dos ajustes da API…": `, e \`PATCH /api/author/:id/status\` para desativar e reativar`.

- [ ] **Step 2: Checagem e commit**

Run: `npm test && npx tsc --noEmit && npx expo lint`
Expected: PASS.

```bash
git add README.md
git commit -m "docs: desativar professor no README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Roteiro manual (Expo Go, com a API rodando)**

Desativar um professor com posts (confirmação, aviso, linha apagada no fim, subtítulo com "· 1 inativo"); tentar entrar com a conta dele (mensagem "Conta desativada…"); conferir que os posts dele continuam na lista; reativar (aviso, volta para o topo); professor logado em outro aparelho é desativado → na próxima ação o app dele sai da conta; tocar duas vezes rápido em "Desativar professor".
