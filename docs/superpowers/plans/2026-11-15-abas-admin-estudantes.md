# Abas Professores e Estudantes no admin: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o admin alterna entre a lista de professores e a lista de estudantes na mesma tela.

**Architecture:** o TC-3 ganha `GET /api/student`, só para ADMIN. No app, `listStudents` e `useStudents` buscam a lista, e `admin/index.tsx` guarda a aba ativa em estado local e troca os dados, o cabeçalho e o botão conforme a aba.

**Tech Stack:** Next.js + Prisma (TC-3), Expo Router + React Native + Jest (TC-4).

**Spec:** `docs/superpowers/specs/2026-11-15-abas-admin-estudantes-design.md`

## Global Constraints

- Execução inline no master, um commit por tarefa.
- No TC-3 já existem mudanças não commitadas (`README.md` e `postman/...json`). Commitar só os arquivos da tarefa.
- Erro de dado do usuário é 400, nunca 401: o app desloga em 401.
- Nada de push sem o ok do usuário.

## Review Focus

- Sessão vencida ao abrir a aba Estudantes: deve ir para o login, sem mostrar erro genérico. Isso é coberto pelo `useRequireToken` e pelo `useHandleApiError` no hook.
- 403 (token de quem não é admin): deve aparecer "Sem conexão com o servidor" com a mensagem da API, sem deslogar.
- Troca rápida de aba enquanto a lista carrega: uma resposta antiga não pode sobrescrever a nova. Isso é coberto pelo `createLatest`.
- Lista vazia: deve aparecer "Nenhum estudante cadastrado".
- Estudante com nome ou e-mail longo: o texto é cortado com `numberOfLines={1}`.

---

### Task 1: rota `GET /api/student` no TC-3

**Files:**
- Modify: `../techchallenge-3/src/app/api/student/route.ts`

- [ ] **Step 1: adicionar o GET** (acima do `POST`; também importar `getSession` de `@/lib/dal`)

```ts
/** Só ADMIN. Lista os estudantes com o e-mail da conta, por nome. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }
  if (session.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Apenas administradores podem ver os estudantes." },
      { status: 403 }
    );
  }

  const students = await db.student.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    students.map((s) => ({ id: s.id, name: s.name, email: s.user.email, createdAt: s.createdAt }))
  );
}
```

- [ ] **Step 2: conferir à mão** com o Docker de pé. Sem token: `curl -i http://localhost:3000/api/student` deve dar 401. Com token de estudante: 403. Com token de admin: 200 e um array.
- [ ] **Step 3: commit** (no TC-3, só este arquivo)

```bash
git add src/app/api/student/route.ts && git commit -m "feat: GET /api/student para o admin"
```

### Task 2: `listStudents` e `studentCountLabel`

**Files:**
- Modify: `src/api/types.ts`, `src/api/students.ts`, `src/lib/admin.ts`
- Test: `src/api/students.test.ts`, `src/lib/admin.test.ts`

**Interfaces:**
- Produces: `type StudentSummary = { id: string; name: string; email: string; createdAt: string }`; `listStudents(token: string): Promise<StudentSummary[]>`; `studentCountLabel(n: number): string`

- [ ] **Step 1: testes que falham**

Em `src/api/students.test.ts` (importar `listStudents`):

```ts
describe('listStudents', () => {
  it('GET /api/student com o token', async () => {
    const list = [{ id: 's1', name: 'Ana', email: 'ana@x.com', createdAt: '2026-11-01T00:00:00.000Z' }];
    respond(200, list);
    await expect(listStudents('tk')).resolves.toEqual(list);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student');
    expect(init).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer tk' } });
  });
  it('falha quando a resposta não é lista', async () => {
    respond(200, { nope: true });
    await expect(listStudents('tk')).rejects.toThrow();
  });
});
```

Em `src/lib/admin.test.ts` (importar `studentCountLabel`):

```ts
describe('studentCountLabel', () => {
  it('singular e plural', () => {
    expect(studentCountLabel(1)).toBe('1 estudante cadastrado');
    expect(studentCountLabel(3)).toBe('3 estudantes cadastrados');
  });
});
```

- [ ] **Step 2:** `npm test -- students admin` → FAIL (função não existe)
- [ ] **Step 3: implementar**

`src/api/types.ts`:

```ts
export type StudentSummary = { id: string; name: string; email: string; createdAt: string };
```

`src/api/students.ts` (importar `ApiError` e `INVALID_RESPONSE` de `./client` e `StudentSummary` de `./types`):

```ts
export async function listStudents(token: string): Promise<StudentSummary[]> {
  const data = await apiRequest<unknown>('/api/student', { token });
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  return data as StudentSummary[];
}
```

`src/lib/admin.ts`:

```ts
export function studentCountLabel(n: number): string {
  return n === 1 ? '1 estudante cadastrado' : `${n} estudantes cadastrados`;
}
```

- [ ] **Step 4:** `npm test -- students admin` → PASS
- [ ] **Step 5: commit**

```bash
git add src/api src/lib/admin.ts src/lib/admin.test.ts && git commit -m "feat: listStudents e rótulo de estudantes"
```

### Task 3: hook, linha e aba Estudantes na tela do admin

**Files:**
- Create: `src/hooks/useStudents.ts`, `src/components/StudentRow.tsx`
- Modify: `src/app/admin/index.tsx`

**Interfaces:**
- Consumes: `listStudents`, `StudentSummary`, `studentCountLabel`, `avatarColor`, `initials`
- Produces: `useStudents(): { status, students, error, refreshing, reload(opts?: { pull?: boolean }) }`

- [ ] **Step 1: `src/hooks/useStudents.ts`**

```ts
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { listStudents } from '@/api/students';
import type { StudentSummary } from '@/api/types';
import { createLatest } from '@/lib/latest';
import { useHandleApiError, useRequireToken } from './useAuthGuard';

type Status = 'loading' | 'success' | 'error';

export function useStudents() {
  const [latest] = useState(createLatest);
  const requireToken = useRequireToken();
  const handleApiError = useHandleApiError();
  const [status, setStatus] = useState<Status>('loading');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(
    (opts?: { pull?: boolean }) => {
      const token = requireToken();
      if (!token) return;
      if (opts?.pull) setRefreshing(true);
      else setStatus('loading');
      latest(listStudents(token))
        .then((res) => {
          if (res.stale) return;
          setStudents(res.value);
          setError(null);
          setStatus('success');
        })
        .catch((err: unknown) => {
          if (handleApiError(err)) return;
          setError(err instanceof ApiError ? err.message : 'Algo deu errado.');
          setStatus('error');
        })
        .finally(() => setRefreshing(false));
    },
    [latest, requireToken, handleApiError],
  );

  return { status, students, error, refreshing, reload };
}
```

- [ ] **Step 2: `src/components/StudentRow.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import type { StudentSummary } from '@/api/types';
import { avatarColor } from '@/lib/admin';
import { initials } from '@/lib/initials';
import { colors, fonts, space } from '@/theme';

export function StudentRow({ student, index }: { student: StudentSummary; index: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${student.name}, ${student.email}`}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(index) }]}>
        <Text style={styles.avatarText}>{initials(student.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{student.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>{student.email}</Text>
      </View>
    </View>
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
});
```

- [ ] **Step 3: abas em `src/app/admin/index.tsx`**

1. Imports: `StudentRow`, `useStudents` e `studentCountLabel` (este último junto do import de `@/lib/admin`).
2. Estado e hook, logo depois de `useAuthors()`:

```ts
const [tab, setTab] = useState<'professores' | 'estudantes'>('professores');
const studentsState = useStudents();
const onStudents = tab === 'estudantes';
const active = onStudents ? studentsState : { status, error, refreshing, reload };
```

3. O foco (e a troca de aba) recarrega a aba ativa:

```ts
const reloadStudents = studentsState.reload;
useFocusEffect(useCallback(() => (onStudents ? reloadStudents() : reload()), [onStudents, reloadStudents, reload]));
```

4. No `header`, trocar o título fixo e o subtítulo por:

```tsx
<View style={styles.tabs} accessibilityRole="tablist">
  {(['professores', 'estudantes'] as const).map((t) => (
    <Pressable
      key={t}
      onPress={() => setTab(t)}
      style={[styles.tab, tab === t && styles.tabOn]}
      accessibilityRole="tab"
      accessibilityState={{ selected: tab === t }}
    >
      <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
        {t === 'professores' ? 'Professores' : 'Estudantes'}
      </Text>
    </Pressable>
  ))}
</View>
<Text style={styles.title} accessibilityRole="header">
  {onStudents ? 'Estudantes' : 'Professores'}
</Text>
{!onStudents && status === 'success' && authors.length > 0 && (
  <Text style={styles.sub}>{teacherCountLabel(authors.length, inactiveCount)}</Text>
)}
{onStudents && studentsState.status === 'success' && studentsState.students.length > 0 && (
  <Text style={styles.sub}>{studentCountLabel(studentsState.students.length)}</Text>
)}
```

5. O bloco `empty` passa a usar `active.status` e `active.error`. Na aba Estudantes, a mensagem de erro padrão é "Não conseguimos carregar os estudantes." e o estado vazio é `<StateMessage emoji="🎒" title="Nenhum estudante cadastrado" message="Os estudantes aparecem aqui depois do cadastro." />`. O "Tentar de novo" chama `active.reload()`.
6. `showList` usa `active.status` e o tamanho da lista da aba ativa. Na aba Estudantes, o `FlatList` recebe `data={showList ? studentsState.students : []}` e `renderItem={({ item, index }) => <StudentRow student={item} index={index} />}`. Para não misturar os tipos, renderizar dois `FlatList` (um por aba) com o mesmo `ListHeaderComponent`, `contentContainerStyle` e `refreshControl` (`refreshing={active.refreshing}`, `onRefresh={() => active.reload({ pull: true })}`).
7. O FAB "＋ Professor" fica dentro de `{!onStudents && ( ... )}`.
8. Estilos novos:

```ts
tabs: { flexDirection: 'row', backgroundColor: colors.subtle, borderRadius: radius.pill, padding: 4, marginBottom: space.md, alignSelf: 'flex-start' },
tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
tabOn: { backgroundColor: colors.admin },
tabText: { fontFamily: fonts.display700, fontSize: 13, color: colors.textFaint },
tabTextOn: { color: colors.onCard },
```

- [ ] **Step 4: verificar:** `npm test`, `npx tsc --noEmit` e `npx expo lint` devem passar. Depois, no app: entrar como admin, trocar para Estudantes, ver a lista, puxar para atualizar e voltar para Professores.
- [ ] **Step 5: commit**

```bash
git add src/hooks/useStudents.ts src/components/StudentRow.tsx src/app/admin/index.tsx && git commit -m "feat: aba Estudantes no painel admin"
```

### Task 4: docs

**Files:**
- Modify: `README.md` (seção do admin: mencionar a aba Estudantes), `requisitos_funcionais_do_app.md` (RF08.3 continua `[ ]`; acrescentar "(listagem pronta; editar/excluir pendentes)")

- [ ] **Step 1:** editar os dois arquivos.
- [ ] **Step 2: commit**

```bash
git add README.md requisitos_funcionais_do_app.md && git commit -m "docs: aba Estudantes no admin"
```
