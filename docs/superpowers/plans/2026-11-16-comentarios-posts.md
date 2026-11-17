# Comentários nos posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estudantes comentam nos posts; o dono edita e exclui, o professor do post e o admin excluem.

**Architecture:** Model `Comment` no Prisma do TC-3 (`../techchallenge-3`) com cascata para Post e Student. Rotas novas: `GET/POST /api/post/[id]/comment` e `PUT/DELETE /api/comment/[id]`. O login passa a mandar `user.studentId`. No app (TC-4), um `CommentsSection` entra embaixo do texto em `post/[id]/index.tsx`, e as regras de permissão ficam em `src/lib/comment.ts`.

**Tech Stack:** Next.js 16 + Prisma 6.19 (MongoDB) + zod 4 no TC-3. Expo Router + React Native + Jest (`jest-expo`) no TC-4.

**Spec:** `docs/superpowers/specs/2026-11-16-comentarios-posts-design.md`

## Global Constraints

- Tarefas 1–3 commitam no repo `../techchallenge-3`; tarefas 4–6, no TC-4. Um commit por tarefa, no `master`, sem push.
- Mensagens de erro exatas: `"Você precisa estar logado."` (401), `"Apenas estudantes podem comentar."`, `"Você não tem permissão para editar este comentário."`, `"Você não tem permissão para excluir este comentário."` (403), `"Post não encontrado."` e `"Comentário não encontrado."` (404).
- Erro de `text` é 400 `{ errors: { text: [...] } }` (nunca 401). Limite: 1000 caracteres depois do trim.
- `route.ts` só exporta handlers. Helpers vão em `src/lib/` do TC-3.
- Nunca escrever o valor real da senha padrão (`DEFAULT_TEACHER_PASSWORD`) em código, docs ou saída de terminal.
- Depois de mudar o schema ou as rotas: `docker compose up -d --build migrate app` em `../techchallenge-3`.
- `requisitos_funcionais_do_app.md` é ignorado pelo git: editar só local.
- Chamadas Bash com `rtk` vão sozinhas, sem `&&` com outras.

## Review Focus

1. Sessão salva antes da mudança (sem `studentId`): o estudante não vê o campo de comentar e o app não quebra. Teste em `comment.test.ts` (Task 4).
2. Salvar o perfil em "Meus dados" não pode apagar o `studentId` da sessão (`PUT /api/student/me` devolve `user` sem ele): `updateUser` mescla com o user atual (Task 4).
3. Texto só de espaços ou com 1001 caracteres dá 400 no campo, não 500. Coberto pelo smoke test da Task 2.
4. Professor de outro post não pode excluir, e estudante que não é dono não pode editar nem excluir: 403. Smoke test (Task 2) e `comment.test.ts` (Task 4).
5. Apagar um post ou um estudante apaga os comentários dele (cascata do Prisma no Mongo, incluindo o `$transaction` de exclusão do estudante). A Task 2 conta os documentos no Mongo.

---

### Task 1: Model `Comment`, schema de validação e `studentId` no login (TC-3)

**Files:**
- Modify: `../techchallenge-3/prisma/schema.prisma`
- Modify: `../techchallenge-3/src/lib/definition.ts` (no fim do arquivo)
- Create: `../techchallenge-3/src/lib/comment.ts`
- Modify: `../techchallenge-3/src/lib/login-response.ts`

**Interfaces:**
- Produces: `db.comment`, `CommentFormSchema` (`{ text: string }` com trim), `commentSelect` (select do Prisma que devolve `{ id, text, postId, studentId, createdAt, updatedAt, student: { id, name } }`), `user.studentId: string | null` na resposta do login, do primeiro acesso e do cadastro de estudante.

- [ ] **Step 1: Schema.** Em `prisma/schema.prisma`, adicionar `comments Comment[]` em `model Student` (depois de `userId`) e em `model Post` (depois de `updatedAt`). No fim do arquivo:

```prisma
// Comentário de um estudante num post. Apagar o post ou o estudante apaga
// os comentários (o Prisma faz a cascata no MongoDB).
model Comment {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  text      String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String   @db.ObjectId
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId String   @db.ObjectId
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Validação.** No fim de `src/lib/definition.ts`:

```ts
export const CommentFormSchema = z.object({
    // error: mensagem também quando text não é string (ausente, número...).
    text: z.string({ error: 'Escreva o comentário.' })
        .trim()
        .min(1, 'Escreva o comentário.')
        .max(1000, 'O comentário pode ter até 1000 caracteres.'),
});
```

- [ ] **Step 3: Select compartilhado.** Criar `src/lib/comment.ts`:

```ts
/** Formato de um comentário nas respostas da API (nome do estudante, sem e-mail). */
export const commentSelect = {
  id: true,
  text: true,
  postId: true,
  studentId: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, name: true } },
} as const;
```

- [ ] **Step 4: Login.** Em `src/lib/login-response.ts`, trocar a busca do author por:

```ts
  // Perfis ligados ao usuário: professor(a) tem Author, aluno(a) tem Student.
  const [author, student] = await Promise.all([
    db.author.findUnique({ where: { userId: user.id } }),
    db.student.findUnique({ where: { userId: user.id } }),
  ]);
```

E no objeto `user` da resposta, depois de `authorId`: `studentId: student?.id ?? null,`.

- [ ] **Step 5: Gerar e checar.** Em `../techchallenge-3`: `npx prisma generate`, depois `npx tsc --noEmit`, depois `npx eslint src`. Esperado: sem erros.

- [ ] **Step 6: Commit (TC-3)**

```bash
git add prisma/schema.prisma src/lib/definition.ts src/lib/comment.ts src/lib/login-response.ts
git commit -m "feat: model Comment e studentId no login"
```

---

### Task 2: Rotas de comentários (TC-3)

**Files:**
- Create: `../techchallenge-3/src/app/api/post/[id]/comment/route.ts`
- Create: `../techchallenge-3/src/app/api/comment/[id]/route.ts`
- Scratch (não commitar): `<scratchpad>/comment-smoke.mjs`

**Interfaces:**
- Consumes: `CommentFormSchema`, `commentSelect` (Task 1), `getSession`, `isObjectId`.
- Produces: `GET /api/post/[id]/comment` → 200 `Comment[]` em ordem crescente de `createdAt`; `POST` → 201 `{ data, message: "Comentário publicado!" }`; `PUT /api/comment/[id]` → 200 `{ data, message: "Comentário atualizado!" }`; `DELETE` → 200 `{ message: "Comentário removido!" }`.

- [ ] **Step 1: `src/app/api/post/[id]/comment/route.ts`**

```ts
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/dal";
import { isObjectId } from "@/lib/object-id";
import { commentSelect } from "@/lib/comment";
import { CommentFormSchema } from "@/lib/definition";
import { Role } from "../../../../../../generated/prisma/client";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const postNotFound = () =>
  NextResponse.json({ error: "Post não encontrado." }, { status: 404 });

function findPost(id: string) {
  return isObjectId(id) ? db.post.findUnique({ where: { id }, select: { id: true } }) : null;
}

/** Público: comentários do post, do mais antigo para o mais novo. */
export async function GET(_request: Request, { params }: Params) {
  const post = await findPost((await params).id);
  if (!post) return postNotFound();

  const comments = await db.comment.findMany({
    where: { postId: post.id },
    select: commentSelect,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

/** Só estudante comenta. */
export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });
  }

  const student =
    session.role === Role.STUDENT
      ? await db.student.findUnique({ where: { userId: session.id } })
      : null;
  if (!student) {
    return NextResponse.json({ error: "Apenas estudantes podem comentar." }, { status: 403 });
  }

  const post = await findPost((await params).id);
  if (!post) return postNotFound();

  const body = await request.json().catch(() => null);
  const validatedFields = CommentFormSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { errors: validatedFields.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const comment = await db.comment.create({
    data: { text: validatedFields.data.text, postId: post.id, studentId: student.id },
    select: commentSelect,
  });

  return NextResponse.json(
    { data: comment, message: "Comentário publicado!" },
    { status: 201 }
  );
}
```

- [ ] **Step 2: `src/app/api/comment/[id]/route.ts`**

```ts
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/dal";
import { isObjectId } from "@/lib/object-id";
import { commentSelect } from "@/lib/comment";
import { CommentFormSchema } from "@/lib/definition";
import { Role } from "../../../../../generated/prisma/client";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const notFound = () =>
  NextResponse.json({ error: "Comentário não encontrado." }, { status: 404 });

const unauthorized = () =>
  NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 });

function findComment(id: string) {
  return isObjectId(id)
    ? db.comment.findUnique({
        where: { id },
        include: {
          student: { select: { userId: true } },
          post: { select: { authorId: true } },
        },
      })
    : null;
}

/** Só o estudante dono edita. */
export async function PUT(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const comment = await findComment((await params).id);
  if (!comment) return notFound();

  if (comment.student.userId !== session.id) {
    return NextResponse.json(
      { error: "Você não tem permissão para editar este comentário." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const validatedFields = CommentFormSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { errors: validatedFields.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await db.comment.update({
    where: { id: comment.id },
    data: { text: validatedFields.data.text },
    select: commentSelect,
  });

  return NextResponse.json({ data: updated, message: "Comentário atualizado!" });
}

/** Excluem: o dono, o professor dono do post e o ADMIN. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  const comment = await findComment((await params).id);
  if (!comment) return notFound();

  const allowed =
    comment.student.userId === session.id ||
    session.role === Role.ADMIN ||
    (await db.author.findUnique({ where: { userId: session.id } }))?.id === comment.post.authorId;

  if (!allowed) {
    return NextResponse.json(
      { error: "Você não tem permissão para excluir este comentário." },
      { status: 403 }
    );
  }

  await db.comment.delete({ where: { id: comment.id } });

  return NextResponse.json({ message: "Comentário removido!" });
}
```

- [ ] **Step 3: Checar e subir.** Em `../techchallenge-3`: `npx tsc --noEmit` e `npx eslint src` sem erros. Depois `docker compose up -d --build migrate app` e esperar o healthcheck (`docker compose ps` mostra `app` healthy).

- [ ] **Step 4: Smoke test.** Criar `<scratchpad>/comment-smoke.mjs`. Ele lê a senha padrão do `.env` do TC-3 sem imprimir o valor:

```js
// node comment-smoke.mjs <caminho do .env do TC-3>
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);
const BASE = 'http://localhost:3000';
const ADMIN = { email: env.ADMIN_EMAIL || 'admin@techchallenge.com', password: env.ADMIN_PASSWORD || 'admin123' };
const DEFAULT_PW = env.DEFAULT_TEACHER_PASSWORD;
let fails = 0;

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
function expect(label, got, want) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${got}${ok ? '' : ` (esperado ${want})`}`);
}
const login = async (email, password) => (await call('POST', '/api/auth/login', null, { email, password })).body;

async function professor(adminToken, tag) {
  const email = `prof.${tag}.${Date.now()}@techchallenge.com`;
  await call('POST', '/api/author', adminToken, { name: `Prof ${tag}`, email });
  const pw = 'senhaProf12345';
  const fa = await call('POST', '/api/auth/first-access', null, { email, currentPassword: DEFAULT_PW, password: pw, confirmPassword: pw });
  return fa.body;
}
async function student(tag) {
  const email = `aluno.${tag}.${Date.now()}@techchallenge.com`;
  const pw = 'senhaAluno12345';
  return (await call('POST', '/api/student', null, { name: `Aluno ${tag}`, email, password: pw, confirmPassword: pw })).body;
}

const admin = await login(ADMIN.email, ADMIN.password);
const profA = await professor(admin.token, 'a');
const profB = await professor(admin.token, 'b');
const alunoA = await student('a');
const alunoB = await student('b');
expect('login traz studentId do aluno', typeof alunoA.user.studentId, 'string');
expect('login traz studentId null do professor', profA.user.studentId, null);

const post = (await call('POST', '/api/post', profA.token, { title: 'Post smoke', text: 'Texto' })).body.data;
const P = `/api/post/${post.id}/comment`;

expect('GET público', (await call('GET', P)).status, 200);
expect('GET post inexistente', (await call('GET', '/api/post/000000000000000000000000/comment')).status, 404);
expect('GET id inválido', (await call('GET', '/api/post/abc/comment')).status, 404);
expect('POST sem token', (await call('POST', P, null, { text: 'oi' })).status, 401);
expect('POST professor', (await call('POST', P, profA.token, { text: 'oi' })).status, 403);
expect('POST admin', (await call('POST', P, admin.token, { text: 'oi' })).status, 403);
expect('POST só espaços', (await call('POST', P, alunoA.token, { text: '   ' })).status, 400);
expect('POST 1001 chars', (await call('POST', P, alunoA.token, { text: 'a'.repeat(1001) })).status, 400);
expect('POST sem text', (await call('POST', P, alunoA.token, {})).status, 400);
const c1 = await call('POST', P, alunoA.token, { text: '  primeiro  ' });
expect('POST aluno', c1.status, 201);
expect('POST aplica trim', c1.body.data.text, 'primeiro');
expect('POST traz nome do aluno', c1.body.data.student.name, 'Aluno a');
const c2 = (await call('POST', P, alunoA.token, { text: 'segundo' })).body.data;
const c3 = (await call('POST', P, alunoB.token, { text: 'do B' })).body.data;
const list = (await call('GET', P)).body;
expect('lista em ordem crescente', list.map((c) => c.text).join(','), 'primeiro,segundo,do B');

const C = (c) => `/api/comment/${c.id}`;
expect('PUT dono', (await call('PUT', C(c1.body.data), alunoA.token, { text: 'editado' })).status, 200);
expect('PUT outro aluno', (await call('PUT', C(c1.body.data), alunoB.token, { text: 'x' })).status, 403);
expect('PUT professor do post', (await call('PUT', C(c1.body.data), profA.token, { text: 'x' })).status, 403);
expect('PUT vazio', (await call('PUT', C(c1.body.data), alunoA.token, { text: '' })).status, 400);
expect('PUT inexistente', (await call('PUT', '/api/comment/000000000000000000000000', alunoA.token, { text: 'x' })).status, 404);
expect('DELETE outro aluno', (await call('DELETE', C(c2), alunoB.token)).status, 403);
expect('DELETE professor de outro post', (await call('DELETE', C(c2), profB.token)).status, 403);
expect('DELETE sem token', (await call('DELETE', C(c2))).status, 401);
expect('DELETE dono', (await call('DELETE', C(c1.body.data), alunoA.token)).status, 200);
expect('DELETE professor do post', (await call('DELETE', C(c2), profA.token)).status, 200);
expect('DELETE admin', (await call('DELETE', C(c3), admin.token)).status, 200);
expect('DELETE já removido', (await call('DELETE', C(c3), admin.token)).status, 404);

// Cascata: um comentário por aluno; depois apaga o aluno B e o post.
await call('POST', P, alunoA.token, { text: 'fica até o post sumir' });
await call('POST', P, alunoB.token, { text: 'some com o aluno' });
expect('DELETE estudante B (admin)', (await call('DELETE', `/api/student/${alunoB.user.studentId}`, admin.token)).status, 200);
expect('comentário do B sumiu', (await call('GET', P)).body.length, 1);
expect('DELETE post', (await call('DELETE', `/api/post/${post.id}`, profA.token)).status, 200);
console.log(`POST_ID=${post.id}`);
console.log(fails ? `${fails} falha(s)` : 'tudo ok');
process.exit(fails ? 1 : 0);
```

Rodar: `node "<scratchpad>/comment-smoke.mjs" "d:/workspace/techchallenge-3/.env"`. Esperado: `tudo ok`. Depois confirmar que a cascata do post apagou os comentários no Mongo, trocando `<POST_ID>` pelo valor impresso:

`docker compose exec mongodb mongosh techchallenge3 --quiet --eval 'db.Comment.countDocuments({ postId: ObjectId("<POST_ID>") })'`

Esperado: `0`. Se algum caso falhar, corrigir a rota (não o teste) e rodar de novo. Os professores de smoke ficam no banco de dev (sem posts), o que é aceitável.

- [ ] **Step 5: Commit (TC-3)**

```bash
git add "src/app/api/post/[id]/comment/route.ts" "src/app/api/comment/[id]/route.ts"
git commit -m "feat: rotas de comentários nos posts"
```

---

### Task 3: README e Postman do TC-3

**Files:**
- Modify: `../techchallenge-3/README.md` (Modelo de dados, tabela de rotas, exemplos do login)
- Modify: `../techchallenge-3/postman/TechChallenge3.postman_collection.json`
- Scratch: `<scratchpad>/postman-comments.mjs`

- [ ] **Step 1: README, modelo.** Em "Modelo de dados", acrescentar `comments Comment[]` em `Student` e em `Post`, e o bloco `model Comment` da Task 1 (sem o comentário de cima). Trocar o bullet "`Student` e `User.origemId` estão modelados, mas nenhuma rota..." por estes dois:
  - `Comment` pertence a um `Post` e a um `Student`. Apagar o post ou o estudante apaga os comentários dele (`onDelete: Cascade`).
  - `User.origemId` está modelado, mas nenhuma rota ou tela usa.

- [ ] **Step 2: README, rotas.** Achar a tabela de rotas com `grep -n "| \`DELETE\` | \`/api/post" README.md` e, logo depois das linhas de post, inserir:

```markdown
| `GET` | `/api/post/[id]/comment` | Pública | — | `200` — comentários do post, do mais antigo para o mais novo: `[{ id, text, postId, studentId, createdAt, updatedAt, student: { id, name } }]` · `404` post inexistente |
| `POST` | `/api/post/[id]/comment` | **STUDENT** | `{ "text": string }` (1–1000, com trim) | `201` — `{ data: comentário, message }` · `400` `{ errors: { text } }` · `401` sem sessão · `403` não é estudante · `404` post inexistente |
| `PUT` | `/api/comment/[id]` | Dono do comentário | `{ "text": string }` | `200` — `{ data: comentário, message }` · `400` · `401` · `403` não é o dono · `404` |
| `DELETE` | `/api/comment/[id]` | Dono, professor dono do post ou ADMIN | — | `200` — `{ message }` · `401` · `403` · `404` |
```

Se a tabela não tiver linhas de post, inserir antes da primeira linha de `/api/student`, mantendo as mesmas colunas.

- [ ] **Step 3: README, login.** Trocar todas as ocorrências de `user: { id, name, role, authorId }` por `user: { id, name, role, authorId, studentId }`. Nos exemplos JSON de estudante, `"authorId": null }` vira `"authorId": null, "studentId": "6650f1c2a1b2c3d4e5f60730" }`. Usar `grep -n "authorId" README.md` para achar todas. Na linha do `PUT /api/student/me` (a resposta continua sem `studentId`), deixar como está.

- [ ] **Step 4: Postman.** Criar `<scratchpad>/postman-comments.mjs`. Ele:
  1. Acrescenta `"studentId"` nas checagens `have.all.keys("id", "name", "role", "authorId")` das respostas de login. A do `PUT /api/student/me`, que não traz `studentId`, fica como está.
  2. Insere uma pasta `"4.1 Comentários"` logo depois da pasta `"4. Posts"` (o `{{postId}}` ainda existe e `{{token}}` é o do professor). Ela cria um estudante próprio em `commentStudentToken`. Os itens seguem o formato da pasta Posts (`protocolProfileBehavior.disableCookies: true`, um `pm.test` de status por item):

```js
// node postman-comments.mjs <collection.json>
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
const c = JSON.parse(readFileSync(file, 'utf8'));

// No JSON parseado as aspas não vêm escapadas.
const KEYS_OLD = 'have.all.keys("id", "name", "role", "authorId")';
const KEYS_NEW = 'have.all.keys("id", "name", "role", "authorId", "studentId")';
let swapped = 0;
for (const folder of c.item) {
  for (const it of folder.item ?? []) {
    if (it.request.method === 'PUT' && it.request.url.raw.endsWith('/api/student/me')) continue; // PUT /me não traz studentId
    for (const ev of it.event ?? []) {
      ev.script.exec = ev.script.exec.map((l) => (l.includes(KEYS_OLD) ? (swapped++, l.replace(KEYS_OLD, KEYS_NEW)) : l));
    }
  }
}
console.log(`chaves trocadas: ${swapped}`);

const url = (path) => ({ raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.slice(1).split('/') });
const json = (o) => ({ mode: 'raw', raw: JSON.stringify(o, null, 2), options: { raw: { language: 'json' } } });
const bearer = (v) => ({ type: 'bearer', bearer: [{ key: 'token', value: `{{${v}}}`, type: 'string' }] });
const item = (name, method, path, { auth, body, tests, pre, description }) => ({
  name,
  request: {
    method,
    header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    url: url(path),
    description,
    ...(auth ? { auth } : {}),
    ...(body ? { body: json(body) } : {}),
  },
  protocolProfileBehavior: { disableCookies: true },
  event: [
    ...(pre ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: pre } }] : []),
    { listen: 'test', script: { type: 'text/javascript', exec: tests } },
  ],
});
const status = (n) => `pm.test("Status ${n}", () => pm.response.to.have.status(${n}));`;

const folder = {
  name: '4.1 Comentários',
  description: 'Estudantes comentam nos posts. O dono edita e exclui; o professor dono do post e o ADMIN excluem. Usa o `{{postId}}` da pasta Posts e cria um estudante próprio (`{{commentStudentToken}}`).',
  item: [
    item('Cadastrar estudante para comentar', 'POST', '/api/student', {
      auth: { type: 'noauth' },
      pre: ['pm.collectionVariables.set("commentStudentEmail", `comenta.${Date.now()}@techchallenge.com`);'],
      body: { name: 'Caio Lima', email: '{{commentStudentEmail}}', password: '{{studentPassword}}', confirmPassword: '{{studentPassword}}' },
      tests: [status(201), 'const b = pm.response.json();', 'pm.test("studentId no login", () => pm.expect(b.user.studentId).to.be.a("string"));', 'pm.collectionVariables.set("commentStudentToken", b.token);'],
      description: 'Pública. Cria o estudante que comenta nesta pasta.',
    }),
    item('Listar comentários (público)', 'GET', '/api/post/{{postId}}/comment', {
      auth: { type: 'noauth' },
      tests: [status(200), 'pm.test("Retorna um array", () => pm.expect(pm.response.json()).to.be.an("array"));'],
      description: 'Pública. Comentários do post, do mais antigo para o mais novo, com `student: { id, name }`. `404` se o post não existe.',
    }),
    item('Comentar sem token (401)', 'POST', '/api/post/{{postId}}/comment', {
      auth: { type: 'noauth' }, body: { text: 'Oi' }, tests: [status(401)],
      description: 'Sem sessão: `401`.',
    }),
    item('Comentar como professor (403)', 'POST', '/api/post/{{postId}}/comment', {
      body: { text: 'Oi' }, tests: [status(403)],
      description: 'Só estudante comenta. Usa o `{{token}}` do professor.',
    }),
    item('Comentar vazio (400)', 'POST', '/api/post/{{postId}}/comment', {
      auth: bearer('commentStudentToken'), body: { text: '   ' },
      tests: [status(400), 'pm.test("Erro no campo text", () => pm.expect(pm.response.json().errors.text).to.be.an("array"));'],
      description: '`text` é obrigatório, com trim, até 1000 caracteres.',
    }),
    item('Comentar (estudante)', 'POST', '/api/post/{{postId}}/comment', {
      auth: bearer('commentStudentToken'), body: { text: 'Gostei muito da aula!' },
      tests: [status(201), 'const b = pm.response.json();', 'pm.test("Traz o nome do estudante", () => pm.expect(b.data.student.name).to.eql("Caio Lima"));', 'pm.collectionVariables.set("commentId", b.data.id);'],
      description: '**STUDENT**. Respostas: `201` · `400` · `401` · `403` · `404`.',
    }),
    item('Editar comentário como professor (403)', 'PUT', '/api/comment/{{commentId}}', {
      body: { text: 'x' }, tests: [status(403)],
      description: 'Só o dono edita.',
    }),
    item('Editar comentário (dono)', 'PUT', '/api/comment/{{commentId}}', {
      auth: bearer('commentStudentToken'), body: { text: 'Gostei muito da aula! (editado)' },
      tests: [status(200), 'pm.test("Texto atualizado", () => pm.expect(pm.response.json().data.text).to.include("editado"));'],
      description: 'Dono do comentário. Respostas: `200` · `400` · `401` · `403` · `404`.',
    }),
    item('Excluir comentário (professor do post)', 'DELETE', '/api/comment/{{commentId}}', {
      tests: [status(200)],
      description: 'Excluem: o dono, o professor dono do post e o ADMIN. Usa o `{{token}}` do professor.',
    }),
    item('Excluir comentário já excluído (404)', 'DELETE', '/api/comment/{{commentId}}', {
      tests: [status(404)],
      description: 'Comentário inexistente: `404`.',
    }),
  ],
};

const postsIdx = c.item.findIndex((f) => f.name.startsWith('4.'));
c.item = c.item.filter((f) => f.name !== folder.name);
c.item.splice(postsIdx + 1, 0, folder);
for (const key of ['commentStudentEmail', 'commentStudentToken', 'commentId']) {
  if (!c.variable.some((v) => v.key === key)) c.variable.push({ key, value: '' });
}
writeFileSync(file, JSON.stringify(c, null, '\t') + '\n');
console.log('ok');
```

Antes de rodar, conferir a indentação original do JSON (`head -c 200` do arquivo) e usar a mesma no `JSON.stringify` (tab ou 2 espaços), para o diff não reescrever o arquivo inteiro. Rodar: `node "<scratchpad>/postman-comments.mjs" "d:/workspace/techchallenge-3/postman/TechChallenge3.postman_collection.json"`. Depois:
  - `git diff --stat` mostra só a coleção e o README;
  - o script imprime `chaves trocadas: N`, com N entre 1 e 7 (os 7 menos os do `PUT /api/student/me`);
  - `node -e "require('./postman/TechChallenge3.postman_collection.json')"` não deve dar erro.

- [ ] **Step 5: Commit (TC-3)**

```bash
git add README.md postman/TechChallenge3.postman_collection.json
git commit -m "docs: comentários nos posts no README e no Postman"
```

---

### Task 4: Tipos, cliente da API e regras de permissão (TC-4)

**Files:**
- Modify: `src/api/types.ts`
- Create: `src/api/comments.ts`
- Test: `src/api/comments.test.ts`
- Create: `src/lib/comment.ts`
- Test: `src/lib/comment.test.ts`
- Modify: `src/auth/AuthContext.tsx:65-73` (`updateUser`)

**Interfaces:**
- Produces:
  - `type Comment = { id: string; text: string; postId: string; studentId: string; createdAt: string; updatedAt: string; student: { id: string; name: string } }`
  - `SessionUser.studentId?: string | null` (opcional porque sessões salvas antes não têm o campo)
  - `listComments(postId: string): Promise<Comment[]>`
  - `createComment(postId: string, text: string, token: string): Promise<Comment>`
  - `updateComment(id: string, text: string, token: string): Promise<Comment>`
  - `deleteComment(id: string, token: string): Promise<void>`
  - `canComment(user: SessionUser | null): boolean`
  - `canEditComment(user: SessionUser | null, comment: Pick<Comment, 'studentId'>): boolean`
  - `canDeleteComment(user: SessionUser | null, comment: Pick<Comment, 'studentId'>, post: Pick<Post, 'authorId'>): boolean`

- [ ] **Step 1: Testes que falham.** `src/lib/comment.test.ts`:

```ts
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
```

`src/api/comments.test.ts`:

```ts
import { createComment, deleteComment, listComments, updateComment } from './comments';

const fetchMock = jest.fn();
const ok = (body: unknown, status = 200) => ({ ok: true, status, json: async () => body }) as Response;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
});

describe('comments api', () => {
  it('listComments chama a rota do post', async () => {
    fetchMock.mockResolvedValue(ok([]));
    await expect(listComments('p1')).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test:3000/api/post/p1/comment');
  });

  it('listComments rejeita resposta que não é lista', async () => {
    fetchMock.mockResolvedValue(ok({ hello: 'world' }));
    await expect(listComments('p1')).rejects.toMatchObject({ message: 'Resposta inválida do servidor.' });
  });

  it('createComment manda text e token e devolve data', async () => {
    fetchMock.mockResolvedValue(ok({ data: { id: 'c1' } }, 201));
    await expect(createComment('p1', 'oi', 't')).resolves.toEqual({ id: 'c1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/post/p1/comment');
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ text: 'oi' }) });
    expect(init.headers.Authorization).toBe('Bearer t');
  });

  it('updateComment usa PUT na rota do comentário', async () => {
    fetchMock.mockResolvedValue(ok({ data: { id: 'c1' } }));
    await updateComment('c1', 'novo', 't');
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test:3000/api/comment/c1');
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
  });

  it('deleteComment usa DELETE', async () => {
    fetchMock.mockResolvedValue(ok({ message: 'ok' }));
    await deleteComment('c1', 't');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.** `npx jest src/lib/comment.test.ts src/api/comments.test.ts`. Esperado: FAIL, módulos não encontrados.

- [ ] **Step 3: Tipos.** Em `src/api/types.ts`, em `SessionUser`, depois de `authorId`:

```ts
  /** Perfil de estudante. Ausente em sessões salvas antes dos comentários. */
  studentId?: string | null;
```

E no fim do arquivo:

```ts
export type Comment = {
  id: string;
  text: string;
  postId: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
  student: { id: string; name: string };
};
```

- [ ] **Step 4: Cliente.** `src/api/comments.ts`:

```ts
import { ApiError, apiRequest, INVALID_RESPONSE } from './client';
import type { Comment } from './types';

export async function listComments(postId: string): Promise<Comment[]> {
  const data = await apiRequest<unknown>(`/api/post/${encodeURIComponent(postId)}/comment`);
  if (!Array.isArray(data)) throw new ApiError(200, INVALID_RESPONSE);
  return data as Comment[];
}

export async function createComment(postId: string, text: string, token: string): Promise<Comment> {
  const res = await apiRequest<{ data: Comment }>(`/api/post/${encodeURIComponent(postId)}/comment`, {
    method: 'POST',
    body: { text },
    token,
  });
  return res.data;
}

export async function updateComment(id: string, text: string, token: string): Promise<Comment> {
  const res = await apiRequest<{ data: Comment }>(`/api/comment/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { text },
    token,
  });
  return res.data;
}

export async function deleteComment(id: string, token: string): Promise<void> {
  await apiRequest(`/api/comment/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}
```

- [ ] **Step 5: Regras.** `src/lib/comment.ts`:

```ts
import type { Comment, Post, SessionUser } from '@/api/types';

/** A API só aceita comentário de estudante. Sessão antiga sem studentId precisa logar de novo. */
export function canComment(user: SessionUser | null): boolean {
  return user?.role === 'STUDENT' && !!user.studentId;
}

export function canEditComment(user: SessionUser | null, comment: Pick<Comment, 'studentId'>): boolean {
  return !!user?.studentId && user.studentId === comment.studentId;
}

/** Excluem: o dono, o admin e o professor dono do post. */
export function canDeleteComment(
  user: SessionUser | null,
  comment: Pick<Comment, 'studentId'>,
  post: Pick<Post, 'authorId'>,
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN' || canEditComment(user, comment)) return true;
  return user.authorId !== null && user.authorId === post.authorId;
}
```

- [ ] **Step 6: `updateUser` preserva o studentId.** Em `src/auth/AuthContext.tsx`, no `updateUser`, trocar `const next: Session = { ...session, user };` por:

```ts
      // PUT /api/student/me não devolve studentId: mescla para não perdê-lo.
      const next: Session = { ...session, user: { ...session.user, ...user } };
```

- [ ] **Step 7: Rodar e ver passar.** `npm test`, `npx tsc --noEmit` e `npx expo lint`. Esperado: tudo verde.

- [ ] **Step 8: Commit**

```bash
git add src/api/types.ts src/api/comments.ts src/api/comments.test.ts src/lib/comment.ts src/lib/comment.test.ts src/auth/AuthContext.tsx
git commit -m "feat: cliente e regras de comentários no app"
```

---

### Task 5: Seção de comentários na tela do post (TC-4)

**Files:**
- Create: `src/hooks/useComments.ts`
- Create: `src/components/CommentItem.tsx`
- Create: `src/components/CommentsSection.tsx`
- Modify: `src/app/post/[id]/index.tsx` (import e render depois do `<Text style={styles.body}>`)

**Interfaces:**
- Consumes: tudo da Task 4, mais `useAuth`, `useHandleApiError`, `useRequireToken`, `toFormError`, `Field`, `PrimaryButton`, `IconButton`, `ConfirmSheet`, `formatDate`.
- Produces: `useComments(postId)` → `{ status: 'loading' | 'success' | 'error'; comments: Comment[]; error: ApiError | null; reload(): void }` e `<CommentsSection post={post} />`.

- [ ] **Step 1: Hook.** `src/hooks/useComments.ts` (mesmo padrão de `usePost`):

```ts
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { listComments } from '@/api/comments';
import type { Comment } from '@/api/types';

type Status = 'loading' | 'success' | 'error';

export function useComments(postId: string) {
  const [status, setStatus] = useState<Status>('loading');
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<ApiError | null>(null);

  const reload = useCallback(() => {
    setStatus((s) => (s === 'success' ? s : 'loading'));
    listComments(postId)
      .then((list) => {
        setComments(list);
        setError(null);
        setStatus('success');
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err : new ApiError(0, 'Algo deu errado.'));
        setStatus('error');
      });
  }, [postId]);

  return { status, comments, error, reload };
}
```

- [ ] **Step 2: Item.** `src/components/CommentItem.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Comment } from '@/api/types';
import { Field } from '@/components/Field';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { formatDate } from '@/lib/formatDate';
import { colors, fonts, radius, space } from '@/theme';

/** `fieldError` = mensagem do campo; ausente com ok=false = erro já mostrado. */
export type SaveResult = { ok: boolean; fieldError?: string };

type Props = {
  comment: Comment;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (text: string) => Promise<SaveResult>;
  onDelete: () => void;
};

export function CommentItem({ comment, canEdit, canDelete, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await onSave(text);
    setSaving(false);
    setError(res.fieldError);
    if (res.ok) setEditing(false);
  }

  function cancel() {
    setText(comment.text);
    setError(undefined);
    setEditing(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.meta}>
          {comment.student.name} · {formatDate(comment.createdAt)}
        </Text>
        {!editing && (
          <View style={styles.actions}>
            {canEdit && (
              <IconButton label="✎" accessibilityLabel="Editar comentário" onPress={() => setEditing(true)} />
            )}
            {canDelete && (
              <IconButton label="🗑" tone="danger" accessibilityLabel="Excluir comentário" onPress={onDelete} />
            )}
          </View>
        )}
      </View>
      {editing ? (
        <>
          <Field label="Editar comentário" value={text} onChangeText={setText} multiline error={error} maxLength={1000} style={styles.input} />
          <View style={styles.editRow}>
            <View style={styles.flex}>
              <PrimaryButton label="Cancelar" tone="admin" onPress={cancel} disabled={saving} />
            </View>
            <View style={styles.flex}>
              <PrimaryButton label="Salvar" onPress={save} loading={saving} />
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.text} selectable>
          {comment.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.field, padding: space.md, marginBottom: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
  meta: { fontFamily: fonts.body700, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  text: { fontFamily: fonts.body400, fontSize: 14, lineHeight: 21, color: colors.text },
  input: { minHeight: 90 },
  editRow: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
```

Antes de escrever, conferir que `space.md`, `radius.field` e `fonts.body700` existem em `src/theme.ts`. Se `space.md` não existir, usar o token de espaçamento médio que existir lá, sem número solto.

- [ ] **Step 3: Seção.** `src/components/CommentsSection.tsx`:

```tsx
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { createComment, deleteComment, updateComment } from '@/api/comments';
import type { Comment, Post } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { CommentItem, type SaveResult } from '@/components/CommentItem';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { useComments } from '@/hooks/useComments';
import { canComment, canDeleteComment, canEditComment } from '@/lib/comment';
import { toFormError } from '@/lib/formError';
import { colors, fonts, space } from '@/theme';

type Props = { post: Pick<Post, 'id' | 'authorId'> };

export function CommentsSection({ post }: Props) {
  const { user } = useAuth();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const { status, comments, error, reload } = useComments(post.id);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => reload(), [reload]));

  /** 401 desloga; erro do campo text volta para o campo; o resto vira Alert. */
  function fail(err: unknown, title: string): SaveResult {
    if (handleApiError(err)) return { ok: false };
    const form = toFormError(err);
    const fieldError = form.fieldErrors.text?.[0];
    if (!fieldError) Alert.alert(title, form.error ?? 'Tente de novo.');
    return { ok: false, fieldError };
  }

  async function send() {
    const token = requireToken();
    if (!token) return;
    setSending(true);
    try {
      await createComment(post.id, draft, token);
      setDraft('');
      setDraftError(undefined);
      reload();
    } catch (err) {
      setDraftError(fail(err, 'Não foi possível comentar').fieldError);
    } finally {
      setSending(false);
    }
  }

  async function save(comment: Comment, text: string): Promise<SaveResult> {
    const token = requireToken();
    if (!token) return { ok: false };
    try {
      await updateComment(comment.id, text, token);
      reload();
      return { ok: true };
    } catch (err) {
      return fail(err, 'Não foi possível salvar');
    }
  }

  async function confirmDelete() {
    if (!removing) return;
    const token = requireToken();
    if (!token) {
      setRemoving(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteComment(removing.id, token);
      reload();
    } catch (err) {
      fail(err, 'Não foi possível excluir');
    } finally {
      setDeleting(false);
      setRemoving(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        Comentários{status === 'success' ? ` (${comments.length})` : ''}
      </Text>

      {status === 'loading' && <ActivityIndicator color={colors.text} style={styles.loading} />}

      {status === 'error' && (
        <View style={styles.state}>
          <Text style={styles.muted}>{error?.message ?? 'Não foi possível carregar os comentários.'}</Text>
          <PrimaryButton label="Tentar de novo" tone="admin" onPress={reload} />
        </View>
      )}

      {status === 'success' && comments.length === 0 && (
        <Text style={[styles.muted, styles.state]}>Seja o primeiro a comentar.</Text>
      )}

      {status === 'success' &&
        comments.map((c) => (
          <CommentItem
            key={`${c.id}-${c.updatedAt}`}
            comment={c}
            canEdit={canEditComment(user, c)}
            canDelete={canDeleteComment(user, c, post)}
            onSave={(text) => save(c, text)}
            onDelete={() => setRemoving(c)}
          />
        ))}

      {canComment(user) && (
        <View style={styles.composer}>
          <Field
            label="Seu comentário"
            value={draft}
            onChangeText={setDraft}
            placeholder="Escreva o que achou do post"
            multiline
            maxLength={1000}
            error={draftError}
            style={styles.input}
          />
          <PrimaryButton label="Enviar" onPress={send} loading={sending} disabled={!draft.trim()} />
        </View>
      )}

      <ConfirmSheet
        visible={!!removing}
        title="Excluir este comentário?"
        message="Ele vai sumir para todos. Não dá para desfazer."
        confirmLabel="Excluir comentário"
        onConfirm={confirmDelete}
        onCancel={() => setRemoving(null)}
        loading={deleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  title: { fontFamily: fonts.display800, fontSize: 18, color: colors.text, marginBottom: 12 },
  loading: { marginVertical: 12 },
  state: { gap: 10, marginBottom: 12 },
  muted: { fontFamily: fonts.body400, fontSize: 14, color: colors.textMuted },
  composer: { marginTop: 8 },
  input: { minHeight: 90 },
});
```

`key` com `updatedAt`: depois de editar e recarregar, o item remonta e o `text` local fica em sincronia com o servidor. Conferir as props de `ConfirmSheet` em `src/components/ConfirmSheet.tsx` (a tela do post já usa `visible/title/message/confirmLabel/onConfirm/onCancel/loading`).

- [ ] **Step 4: Tela.** Em `src/app/post/[id]/index.tsx`, importar `import { CommentsSection } from '@/components/CommentsSection';` e, logo depois do `</Text>` do `styles.body`, dentro do `ScrollView`:

```tsx
        <CommentsSection post={post} />
```

Envolver o `ScrollView` existente com `keyboardShouldPersistTaps="handled"` para o botão Enviar responder com o teclado aberto. Se o teclado cobrir o campo no Android, envolver a tela em `KeyboardAvoidingView` (`behavior={Platform.OS === 'ios' ? 'padding' : undefined}`), seguindo o que `PostForm`/`ModalForm` já fazem (conferir lá antes).

- [ ] **Step 5: Checar.** `npm test`, `npx tsc --noEmit` e `npx expo lint`. Esperado: verde.

- [ ] **Step 6: Teste manual no app** (TC-3 no Docker, `npx expo start`):
  1. Sem login: o post mostra os comentários e não mostra o campo.
  2. Estudante (cadastro novo): comenta, vê o comentário na lista, edita com ✎ (Salvar e Cancelar), exclui com 🗑 e confirma. Enviar só espaços: o botão fica desabilitado.
  3. Outro estudante: não vê ✎/🗑 no comentário do primeiro.
  4. Professor dono do post: vê 🗑 em todos e não vê o campo. Professor de outro post: não vê 🗑.
  5. Admin: vê 🗑 em todos.
  6. Estudante: salvar em "Meus dados" e voltar ao post. O campo de comentar continua lá (o `studentId` foi preservado).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useComments.ts src/components/CommentItem.tsx src/components/CommentsSection.tsx "src/app/post/[id]/index.tsx"
git commit -m "feat: comentários na tela do post"
```

---

### Task 6: Docs do app (TC-4)

**Files:**
- Modify: `README.md` (seção `## Telas`)
- Modify (local, ignorado pelo git): `requisitos_funcionais_do_app.md`

- [ ] **Step 1: README.** Em `## Telas`, na descrição da tela do post, acrescentar:

```markdown
- **Comentários:** embaixo do post, qualquer pessoa lê. Estudante logado comenta e edita ou exclui os próprios comentários. O professor dono do post e o admin excluem qualquer comentário dele. Quem já estava logado antes desta versão precisa sair e entrar de novo para comentar.
```

- [ ] **Step 2: Requisitos (local).** Em `requisitos_funcionais_do_app.md`, trocar `- [ ] **RF02.2**` por `- [x] **RF02.2**`. Não fazer `git add` desse arquivo.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: comentários nos posts no README"
```
