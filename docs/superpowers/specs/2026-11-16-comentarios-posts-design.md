# Tech Challenge 4: comentários nos posts (design)

Data: 2026-11-16
Status: aguardando revisão
Fecha: RF02.2 (permitir comentários nos posts)

## Objetivo

Estudantes comentam nos posts, uma ou várias vezes, e podem editar e excluir os próprios comentários. O professor exclui comentários nos posts dele. O admin exclui qualquer comentário.

### Critérios de sucesso

- Na tela do post aparece a seção "Comentários", com a lista em ordem cronológica (nome do estudante, data e texto). Qualquer pessoa vê, mesmo sem login.
- O estudante logado vê um campo para comentar. Quem envia vê o comentário entrar na lista.
- Em cada comentário dele, o estudante vê ✎ (editar no lugar) e 🗑.
- O professor dono do post vê 🗑 em todos os comentários do post. O admin vê 🗑 em todos.
- Excluir pede confirmação (`ConfirmSheet`).
- Apagar um post ou um estudante apaga os comentários dele junto.
- `npm test`, `npx tsc --noEmit` e `npx expo lint` passam.

### Fora do escopo

Respostas a comentários, curtidas, paginação e moderação pela aba admin (o admin exclui pela tela do post). Professor e admin não comentam.

## Model (Tech Challenge 3, `prisma/schema.prisma`)

```prisma
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

Também entram `comments Comment[]` em `Post` e em `Student`. No MongoDB o Prisma faz o `onDelete: Cascade` por conta própria, então os `db.post.delete` e `db.student.delete` que já existem passam a apagar os comentários sem mudar nada no código. Depois de mudar o schema, rodar `npx prisma generate` e rebuildar o Docker.

## API (Tech Challenge 3)

Erros comuns:
- Sem sessão: 401 `{ error: "Você precisa estar logado." }`.
- Post (ou comentário) com id que não é ObjectId, ou inexistente: 404 `{ error: "Post não encontrado." }` / `{ error: "Comentário não encontrado." }`.
- `text` ausente, que não é string, vazio depois do trim ou com mais de 1000 caracteres: 400 `{ errors: { text: [mensagem] } }`.

Formato de um comentário na resposta:
`{ id, text, postId, studentId, createdAt, updatedAt, student: { id, name } }`.

### `GET /api/post/[id]/comment` (público)

200 com o array de comentários do post, do mais antigo para o mais novo. Retorna 404 se o post não existe.

### `POST /api/post/[id]/comment`

Exige sessão com role STUDENT; os outros roles recebem 403 `{ error: "Apenas estudantes podem comentar." }`. Body `{ text }`.
201 `{ data: comentário, message: "Comentário publicado!" }`.

### `PUT /api/comment/[id]`

Só o estudante dono do comentário; os outros recebem 403 `{ error: "Você não tem permissão para editar este comentário." }`. Body `{ text }`.
200 `{ data: comentário, message: "Comentário atualizado!" }`.

### `DELETE /api/comment/[id]`

Pode excluir quem é dono do comentário (estudante), o professor dono do post (`Author.userId === session.id` e `post.authorId === author.id`) ou o ADMIN. Os outros recebem 403 `{ error: "Você não tem permissão para excluir este comentário." }`.
200 `{ message: "Comentário removido!" }`.

O helper com a validação do `text` e o `select` do comentário vai em `src/lib/comment.ts` do TC-3, porque o `route.ts` só pode exportar handlers.

### Login

`loginSuccessResponse` passa a mandar `user.studentId` (o `Student.id` ligado ao usuário, ou `null`), do mesmo jeito que já manda o `authorId`. Isso vale para login, primeiro acesso e cadastro de estudante.

## App (Tech Challenge 4)

- `src/api/types.ts`: tipo `Comment` e `studentId: string | null` em `SessionUser`. Uma sessão salva antes dessa mudança vem sem o campo e é tratada como `null`, então o estudante só precisa entrar de novo para conseguir comentar.
- `src/api/comments.ts`: `listComments(postId)`, `createComment(postId, text, token)`, `updateComment(id, text, token)`, `deleteComment(id, token)`, com teste no estilo de `posts.test.ts`.
- `src/lib/comment.ts`: regras puras com teste.
  - `canComment(user)`: `role === 'STUDENT'` e `studentId` preenchido.
  - `canEditComment(user, comment)`: `user.studentId === comment.studentId`.
  - `canDeleteComment(user, comment, post)`: dono, ou ADMIN, ou `user.authorId === post.authorId`.
- `src/hooks/useComments.ts`: carrega a lista do post e expõe `reload`, no mesmo padrão de `usePost`.
- `src/app/post/[id]/index.tsx`: a seção "Comentários" embaixo do texto.
  - A lista mostra um estado vazio ("Seja o primeiro a comentar") e um estado de erro com "Tentar de novo".
  - O campo de comentar e o botão Enviar só aparecem quando `canComment` é verdadeiro.
  - ✎ troca o texto do comentário por um campo com Salvar e Cancelar. 🗑 abre o `ConfirmSheet`.
  - Os erros passam por `useHandleApiError` (401 desloga). O 400 do campo aparece embaixo do campo, e os outros erros vão para um `Alert`.
- O componente de cada comentário vai em `src/components/CommentItem.tsx`.

## Docs

- README e coleção do Postman do TC-3: as 4 rotas novas e o `studentId` no login.
- README do TC-4: a seção de comentários.
- `requisitos_funcionais_do_app.md`: marcar RF02.2 (o arquivo é ignorado pelo git, então a edição fica só local).

## Testes

- TC-4: `comments.test.ts` (chamadas e formato), `comment.test.ts` (as três regras, incluindo user `null`, professor de outro post, admin e estudante que não é dono).
- TC-3 não tem suíte de testes: validar as rotas pelo Postman/curl contra o Docker (401, 403, 404, 400, sucesso e a cascata ao apagar um post).
