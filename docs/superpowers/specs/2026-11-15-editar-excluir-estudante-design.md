# Tech Challenge 4: editar, excluir e resetar senha de estudante no admin (design)

Data: 2026-11-15
Status: aguardando revisão
Depende de: `2026-11-15-abas-admin-estudantes-design.md` (aba Estudantes)

## Objetivo

Na aba Estudantes do admin, tocar num estudante abre ações para editar nome e e-mail, resetar a senha e excluir a conta.

### Critérios de sucesso

- Tocar numa linha da aba Estudantes abre o sheet com: ✎ Editar, 🔑 Resetar senha, 🗑 Excluir.
- Editar salva nome e e-mail sem mexer na senha. O estudante entra com o e-mail novo e a mesma senha.
- Resetar senha: no próximo login, o estudante usa a senha padrão e cai no formulário de primeiro acesso, que já existe no app.
- Excluir apaga o estudante e a conta de login.
- Depois de cada ação aparece um aviso (toast) e a lista recarrega.
- `npm test`, `npx tsc --noEmit` e `npx expo lint` passam.

### Fora do escopo

Paginação, desativar estudante e trocar a senha pelo admin digitando um valor.

## API (Tech Challenge 3)

As três rotas usam o token da sessão e são só para ADMIN.

- Sem sessão: 401 `{ error: "Você precisa estar logado." }`.
- Quem não é ADMIN: 403 `{ error: "Apenas administradores podem gerenciar estudantes." }`.
- `id` que não é ObjectId, ou estudante inexistente: 404 `{ error: "Estudante não encontrado." }`.

`id` é o do Student, o mesmo da listagem `GET /api/student`.

### `PUT /api/student/[id]`

Body `{ name, email }`, validado com o `CreateAuthorFormSchema` (nome obrigatório, e-mail válido, ambos com trim).

- 400 `{ errors }` por campo.
- 409 `{ error: "Já existe uma conta com esse e-mail." }` quando o e-mail é de outra conta. O índice único (P2002) também vira 409.
- 200 `{ data: { id, name, email, createdAt } }`.
- Atualiza `User.name`, `User.email` e `Student.name` numa transação. A senha não muda.

### `DELETE /api/student/[id]`

- 200 `{ message: "Estudante excluído." }`.
- Apaga o Student e o User numa transação.

### `POST /api/student/[id]/reset-password`

- Lê `DEFAULT_TEACHER_PASSWORD` com trim. Sem valor, ou com menos de 8 caracteres: 500 `{ error: "Senha padrão não configurada no servidor." }`, igual ao cadastro de professor.
- Grava `hash` da senha padrão e `firstAccess: true` no User.
- 200 `{ message: "Senha resetada." }`.
- Uma sessão já aberta no app do estudante continua válida até vencer. A senha padrão vale a partir do próximo login.

O TC-3 não tem testes automatizados. As rotas são conferidas com curl (sem token → 401).

## App

- `src/api/students.ts`:
  - `updateStudent(id, { name, email }, token): Promise<StudentSummary>`, com trim no nome e no e-mail;
  - `deleteStudent(id, token): Promise<void>`;
  - `resetStudentPassword(id, token): Promise<void>`.
- `src/components/StudentRow.tsx`: recebe `onPress` e vira `Pressable`, com o "⋯" igual ao `AuthorRow`.
- `src/components/StudentActionsSheet.tsx`: `ConfirmSheet` com nome e e-mail no topo e as três opções. Resetar e Excluir em vermelho.
- `src/app/admin/estudante/[id]/editar.tsx`: modal no molde de `admin/[id]/renomear.tsx`, com campos Nome e E-mail (params `id`, `name`, `email`). Salvar volta para `/admin` com aviso "Estudante atualizado". Erro de campo aparece no campo; 409 e outros erros, no topo (`toFormError`). Em 404: alerta "Estudante não encontrado" e volta.
- `src/app/_layout.tsx`: registra `admin/estudante/[id]/editar` como modal.
- `src/app/admin/index.tsx`:
  - estado do estudante selecionado e da confirmação pendente (`'reset' | 'delete'`);
  - confirmação de reset: "Resetar a senha de {nome}?" e a mensagem "Na próxima entrada, o estudante usa a senha padrão e cria uma nova.", com o botão "Resetar senha";
  - confirmação de exclusão: "Excluir {nome}?" e a mensagem "A conta de login também é apagada.", com o botão "Excluir";
  - avisos: "Senha resetada" e "Estudante excluído";
  - em 404: alerta "Estudante não encontrado" e recarrega a lista. Um 401 desloga (`useHandleApiError`). Outros erros: alerta com a mensagem da API.

## Testes

- `src/api/students.test.ts`: método, URL, token e body de `updateStudent` (com trim), `deleteStudent` e `resetStudentPassword`.
- Rotas do TC-3: conferência manual com curl.
