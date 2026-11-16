# Editar, excluir e resetar senha de estudante: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** na aba Estudantes, o admin edita nome e e-mail, reseta a senha e exclui um estudante.

**Architecture:** o TC-3 ganha `PUT` e `DELETE /api/student/[id]` e `POST /api/student/[id]/reset-password`, todas só para ADMIN. No app, tocar na linha abre `StudentActionsSheet`. Editar abre um modal novo. Resetar e Excluir usam `ConfirmSheet` em `admin/index.tsx`.

**Tech Stack:** Next.js + Prisma (TC-3), Expo Router + React Native + Jest (TC-4).

**Spec:** `docs/superpowers/specs/2026-11-15-editar-excluir-estudante-design.md`

## Global Constraints

- Execução inline no master, um commit por tarefa. No TC-3, commitar só os arquivos da tarefa (`README.md` e `postman/` têm mudanças alheias).
- Erro de dado do usuário é 400 por campo, nunca 401.
- Nunca escrever o valor da senha padrão em código, docs ou testes. Ler sempre de `DEFAULT_TEACHER_PASSWORD`.
- Depois de mudar o TC-3: `docker compose up -d --build app` para conferir.

## Review Focus

- E-mail igual ao atual no PUT: não pode dar 409 contra a própria conta. A checagem ignora o próprio User.
- Duplo toque em Excluir ou Resetar: o `ConfirmSheet` com `loading` bloqueia o segundo toque.
- Estudante excluído por outro admin enquanto o sheet está aberto: 404 mostra o alerta e recarrega.
- E-mail com espaços nas pontas: trim no app e no schema.
- Sessão vencida ao confirmar: `useRequireToken` leva ao login sem chamar a API.

---

### Task 1: rotas do TC-3

**Files:**
- Create: `../techchallenge-3/src/app/api/student/[id]/route.ts`
- Create: `../techchallenge-3/src/app/api/student/[id]/reset-password/route.ts`

- [ ] **Step 1: `[id]/route.ts`**

```ts
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/dal";
import { isObjectId } from "@/lib/object-id";
import { CreateAuthorFormSchema } from "@/lib/definition";
import { Prisma, Role } from "../../../../../generated/prisma/client";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const EMAIL_TAKEN = { error: "Já existe uma conta com esse e-mail." };
const notFound = () => NextResponse.json({ error: "Estudante não encontrado." }, { status: 404 });

/** Estudante do `id` se a sessão for de ADMIN; senão, a resposta de erro. */
export async function adminStudent(id: string) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  if (session.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Apenas administradores podem gerenciar estudantes." }, { status: 403 });
  }
  if (!isObjectId(id)) return notFound();
  const student = await db.student.findUnique({ where: { id }, include: { user: true } });
  return student ?? notFound();
}

export async function PUT(request: Request, { params }: Params) {
  const student = await adminStudent((await params).id);
  if (student instanceof NextResponse) return student;

  const body = await request.json().catch(() => null);
  const validatedFields = CreateAuthorFormSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json({ errors: validatedFields.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, email } = validatedFields.data;

  if (email !== student.user.email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json(EMAIL_TAKEN, { status: 409 });
  }

  try {
    await db.$transaction([
      db.user.update({ where: { id: student.userId }, data: { name, email } }),
      db.student.update({ where: { id: student.id }, data: { name } }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(EMAIL_TAKEN, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ data: { id: student.id, name, email, createdAt: student.createdAt } });
}

export async function DELETE(_request: Request, { params }: Params) {
  const student = await adminStudent((await params).id);
  if (student instanceof NextResponse) return student;

  await db.$transaction([
    db.student.delete({ where: { id: student.id } }),
    db.user.delete({ where: { id: student.userId } }),
  ]);

  return NextResponse.json({ message: "Estudante excluído." });
}
```

- [ ] **Step 2: `[id]/reset-password/route.ts`**

```ts
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { adminStudent } from "../route";

/** Volta a conta para a senha padrão; o estudante cria outra no primeiro acesso. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const student = await adminStudent((await params).id);
  if (student instanceof NextResponse) return student;

  // trim: o login aplica trim na senha digitada.
  const defaultPassword = process.env.DEFAULT_TEACHER_PASSWORD?.trim();
  if (!defaultPassword || defaultPassword.length < 8) {
    return NextResponse.json({ error: "Senha padrão não configurada no servidor." }, { status: 500 });
  }

  await db.user.update({
    where: { id: student.userId },
    data: { hash: await hash(defaultPassword, 10), firstAccess: true },
  });

  return NextResponse.json({ message: "Senha resetada." });
}
```

- [ ] **Step 3: verificar:** `npx tsc --noEmit` no TC-3 deve passar. Depois de `docker compose up -d --build app`, os comandos `curl -i -X PUT .../api/student/x`, `curl -i -X DELETE .../api/student/x` e `curl -i -X POST .../api/student/x/reset-password` sem token devem dar 401.
- [ ] **Step 4: commit:** `git add "src/app/api/student/[id]" && git commit -m "feat: editar, excluir e resetar senha de estudante (admin)"`

### Task 2: funções da API no app

**Files:**
- Modify: `src/api/students.ts`, `src/api/types.ts`
- Test: `src/api/students.test.ts`

**Interfaces:**
- Produces: `type StudentInput = { name: string; email: string }`; `updateStudent(id: string, input: StudentInput, token: string): Promise<StudentSummary>`; `deleteStudent(id: string, token: string): Promise<void>`; `resetStudentPassword(id: string, token: string): Promise<void>`

- [ ] **Step 1: testes que falham** (acrescentar os imports)

```ts
const summary = { id: 's1', name: 'Ana Souza', email: 'ana@x.com', createdAt: '2026-11-01T00:00:00.000Z' };

describe('updateStudent', () => {
  it('PUT /api/student/:id com nome e e-mail sem espaços nas pontas', async () => {
    respond(200, { data: summary });
    await expect(updateStudent('s1', { name: ' Ana Souza ', email: ' ana@x.com ' }, 'tk')).resolves.toEqual(summary);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/s1');
    expect(init).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer tk' } });
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana Souza', email: 'ana@x.com' });
  });
});

describe('deleteStudent', () => {
  it('DELETE /api/student/:id', async () => {
    respond(200, { message: 'ok' });
    await deleteStudent('s1', 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/s1');
    expect(init).toMatchObject({ method: 'DELETE', headers: { Authorization: 'Bearer tk' } });
  });
});

describe('resetStudentPassword', () => {
  it('POST /api/student/:id/reset-password', async () => {
    respond(200, { message: 'ok' });
    await resetStudentPassword('s1', 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/s1/reset-password');
    expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tk' } });
  });
});
```

- [ ] **Step 2:** `npx jest src/api/students` → FAIL (funções não existem)
- [ ] **Step 3: implementar**

`types.ts`: `export type StudentInput = { name: string; email: string };`

`students.ts`:

```ts
const byId = (id: string) => `/api/student/${encodeURIComponent(id)}`;

export async function updateStudent(id: string, input: StudentInput, token: string): Promise<StudentSummary> {
  const body = { name: input.name.trim(), email: input.email.trim() };
  const res = await apiRequest<{ data: StudentSummary }>(byId(id), { method: 'PUT', body, token });
  return res.data;
}

export async function deleteStudent(id: string, token: string): Promise<void> {
  await apiRequest(byId(id), { method: 'DELETE', token });
}

export async function resetStudentPassword(id: string, token: string): Promise<void> {
  await apiRequest(`${byId(id)}/reset-password`, { method: 'POST', token });
}
```

- [ ] **Step 4:** `npx jest src/api/students` → PASS
- [ ] **Step 5: commit:** `git add src/api && git commit -m "feat: API de editar, excluir e resetar senha de estudante"`

### Task 3: sheet de ações, confirmações e modal de edição

**Files:**
- Create: `src/components/StudentActionsSheet.tsx`, `src/app/admin/estudante/[id]/editar.tsx`
- Modify: `src/components/StudentRow.tsx`, `src/app/admin/index.tsx`, `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `updateStudent`, `deleteStudent`, `resetStudentPassword`, `StudentSummary`, `ConfirmSheet`
- Produces: `StudentActionsSheet({ student, onEdit, onReset, onDelete, onClose })`, `StudentRow({ student, index, onPress })`

- [ ] **Step 1: `StudentRow`:** trocar a `View` externa por `Pressable` com `onPress`, o estilo pressionado `({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]`, `accessibilityRole="button"` e o label `${name}, ${email}. Abrir ações`. Acrescentar `<Text style={styles.more}>⋯</Text>` e o estilo `more: { fontSize: 18, color: colors.textFaint }`.
- [ ] **Step 2: `StudentActionsSheet.tsx`**

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';

import type { StudentSummary } from '@/api/types';
import { colors, fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  student: StudentSummary | null;
  onEdit: () => void;
  onReset: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function StudentActionsSheet({ student, onEdit, onReset, onDelete, onClose }: Props) {
  const options = [
    { label: '✎ Editar', onPress: onEdit, danger: false },
    { label: '🔑 Resetar senha', onPress: onReset, danger: true },
    { label: '🗑 Excluir estudante', onPress: onDelete, danger: true },
  ];
  return (
    <ConfirmSheet visible={!!student} title={student?.name ?? ''} onCancel={onClose}>
      <Text style={styles.sub}>{student?.email ?? ''}</Text>
      {options.map((o, i) => (
        <Pressable
          key={o.label}
          style={[styles.opt, i === options.length - 1 && styles.last]}
          onPress={o.onPress}
          accessibilityRole="button"
        >
          <Text style={[styles.optText, o.danger && { color: colors.danger }]}>{o.label}</Text>
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

- [ ] **Step 3: `admin/estudante/[id]/editar.tsx`:** cópia do `admin/novo.tsx` com estas diferenças:
  - params `{ id, name, email }` como valores iniciais;
  - chama `updateStudent(id, values, token)`;
  - título "Editar estudante"; dica "A senha do estudante não muda."; botão "Salvar";
  - aviso `'Estudante atualizado'`;
  - 404: `Alert.alert('Estudante não encontrado', 'Ele pode ter sido excluído.')` e depois `router.dismissTo('/admin')`.
- [ ] **Step 4: `_layout.tsx`:** acrescentar `<Stack.Screen name="admin/estudante/[id]/editar" options={{ presentation: 'modal' }} />` ao lado de `admin/[id]/renomear`.
- [ ] **Step 5: `admin/index.tsx`**
  - estado `const [student, setStudent] = useState<StudentSummary | null>(null);` e `const [confirming, setConfirming] = useState<{ student: StudentSummary; action: 'reset' | 'delete' } | null>(null);`;
  - `StudentRow` recebe `onPress={() => setStudent(item)}`;
  - `openEditStudent`: fecha o sheet e faz `router.push({ pathname: '/admin/estudante/[id]/editar', params: { id, name, email } })`;
  - `confirmStudent()`: chama `requireToken`, liga `busy`, executa `resetStudentPassword` ou `deleteStudent`, fecha e mostra o aviso (`'Senha resetada'` ou `'Estudante excluído'`). Depois de excluir, chama `studentsState.reload()`. No `catch`: fecha e chama `showStudentError(err)` (401 → `handleApiError`; 404 → `Alert.alert('Estudante não encontrado', 'Ele pode ter sido excluído.')` + reload; outros → `Alert.alert('Não foi possível concluir', mensagem da API)`);
  - renderizar `<StudentActionsSheet>` e um `<ConfirmSheet>`:
    - `visible={!!confirming}` e `loading={busy}`;
    - título `Resetar a senha de ${nome}?` ou `Excluir ${nome}?`;
    - mensagem "Na próxima entrada, o estudante usa a senha padrão e cria uma nova." ou "A conta de login também é apagada.";
    - `confirmLabel` "Resetar senha" ou "Excluir".
- [ ] **Step 6: verificar:** `npm test`, `npx tsc --noEmit` e `npx expo lint` devem passar.
- [ ] **Step 7: commit:** `git add src && git commit -m "feat: editar, excluir e resetar senha de estudante no admin"`

### Task 4: docs

- [ ] README: na seção do admin, listar as ações de estudante. Na tabela de rotas, incluir `/admin/estudante/[id]/editar`.
- [ ] `requisitos_funcionais_do_app.md` (ignorado pelo git; edição só local): RF08.3 com editar e excluir prontos e paginação pendente.
- [ ] commit: `git add README.md && git commit -m "docs: ações de estudante no admin"`
