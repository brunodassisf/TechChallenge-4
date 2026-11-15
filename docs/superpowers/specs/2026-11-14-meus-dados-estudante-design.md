# Tech Challenge 4: "Meus dados" do estudante (design)

Data: 2026-11-14
Status: aguardando revisão
Depende de: `2026-11-13-cadastro-estudante-design.md` (conta de estudante e regra de senha)

## Objetivo

O estudante logado edita o próprio nome e e-mail e pode trocar a senha.

### Critérios de sucesso

- O menu do avatar na lista de posts tem a opção "Meus dados" para estudantes.
- A tela mostra o nome e o e-mail atuais.
- Ao salvar, o novo nome aparece logo nas iniciais do avatar, e o e-mail e a senha novos já valem no próximo login.
- Para trocar o e-mail ou a senha, é preciso informar a senha atual.
- `npm test`, `npx tsc --noEmit` e `npx expo lint` passam.

## API (Tech Challenge 3, a implementar pelo prompt)

As duas rotas usam o token da sessão (`Authorization: Bearer`). Sem sessão, a resposta é 401. Para quem não é STUDENT, a resposta é 403.

`GET /api/student/me` → 200 `{ name, email }`

`PUT /api/student/me` com body `{ name, email, currentPassword?, password?, confirmPassword? }`:

- `name`: obrigatório, sem os espaços das pontas. Atualiza `User.name` e `Student.name` na mesma transação.
- `email`: obrigatório e válido.
- `password` e `confirmPassword`: opcionais. Vazios, a senha continua a mesma. Preenchidos, seguem as regras do cadastro: no mínimo 8 caracteres depois de tirar os espaços, e iguais.
- `currentPassword`: obrigatória quando o e-mail muda ou quando `password` vem preenchida.

Respostas:

- 200 `{ user: { id, name, role, authorId } }`, no mesmo formato de `user` do login.
- 400 `{ errors }` por campo. Sem a senha atual, a mensagem é "Informe a senha atual." em `currentPassword`.
- 401 `{ error: "Senha atual incorreta." }`.
- 409 `{ error: "Já existe uma conta com esse e-mail." }`.

O token guarda só `userId` e `role`, então nenhuma alteração exige login de novo.

## Fluxo

1. O estudante toca no avatar e escolhe "Meus dados".
2. A tela `/perfil` busca nome e e-mail.
3. Ele edita os campos e toca em "Salvar".
4. O app confere os campos e chama a API. O nome salvo no aparelho é atualizado e a tela fecha.

## Tela "Meus dados" (`/perfil`)

- É um modal com o botão ✕ e o título "Meus dados", no padrão de `ModalForm`.
- Enquanto busca os dados, mostra um indicador de carregamento. Se falhar, mostra a mensagem e "Tentar de novo".
- Campos "Nome" e "E-mail", preenchidos com os dados atuais.
- Seção "Trocar senha (opcional)", com os campos "Nova senha" e "Repetir nova senha" ocultos e a dica "Mínimo de 8 caracteres. Deixe em branco para manter a atual."
- O campo "Senha atual" só aparece quando o e-mail digitado é diferente do original ou quando "Nova senha" tem algum caractere.
- Botão "Salvar", com carregamento e proteção contra toque duplo.
- Quem não é estudante, ou não está logado, volta para a lista de posts.

## Validação no aparelho

Antes de chamar a API:

- nome vazio, mesmo depois de tirar os espaços → "Informe o nome." em "Nome";
- se "Nova senha" ou "Repetir nova senha" tiver algum caractere, vale `validateNewPassword`;
- se a senha atual for exigida e estiver vazia → "Informe a senha atual." em "Senha atual".

A comparação do e-mail ignora os espaços das pontas. O formato do e-mail fica com a API.

## Erros

| Situação | Comportamento |
|---|---|
| 400 em `name`, `email`, `currentPassword`, `password` ou `confirmPassword` | Mensagem embaixo do campo |
| 400 em outro campo | Primeira mensagem da API no topo (`stepFormError`) |
| 401 senha atual incorreta | Mensagem no topo; o campo "Senha atual" é limpo |
| 409 e-mail já usado | Mensagem no topo |
| Sem conexão ou 5xx | Mensagem no topo; os campos ficam preenchidos |
| Sessão vencida (401 no GET) | Mensagem da API com "Tentar de novo" |

## Peças

- `src/api/types.ts`: `StudentProfile { name, email }` e `StudentProfileInput`.
- `src/api/students.ts`: `getMyProfile(token)` e `updateMyProfile(input, token)`. A atualização tira os espaços das pontas de nome e e-mail e não envia os campos de senha vazios.
- `src/auth/AuthContext.tsx`: `updateUser(user)`, que troca o `user` da sessão e grava no aparelho.
- `src/lib/profile.ts`, com regras puras:
  - `needsCurrentPassword(original, form)`;
  - `validateProfile(original, form)`;
  - `profileFormError(err)`.
- `src/app/perfil.tsx`: a tela, registrada como modal em `_layout.tsx`.
- `src/app/index.tsx`: a opção "Meus dados" no menu do avatar, só para STUDENT.
- `src/lib/admin.ts` ou uma regra equivalente: `isStudent(user)`.
- `README.md`: a tela e a dependência da API.

## Testes

- `getMyProfile` e `updateMyProfile`: método, URL, token, body sem espaços nas pontas e sem os campos de senha vazios.
- `needsCurrentPassword`: nada mudou, só o nome mudou, o e-mail mudou, só espaços no e-mail, nova senha preenchida.
- `validateProfile`: nome vazio, senha curta, senhas diferentes, senha atual exigida e vazia, troca só de nome sem senha.
- `profileFormError`: campo mostrado fica no campo; campo de fora sobe para o topo.

## Fora do escopo

Campos novos (telefone, turma), edição de dados pelo professor e pelo admin, gestão de estudantes pelo admin (RF08), confirmação do e-mail novo, encerrar outras sessões depois de trocar a senha e "esqueci minha senha".

## Risco aceito

Trocar a senha não derruba outras sessões abertas: o token antigo continua valendo até expirar, em 7 dias. Para estudante, que só lê posts, o impacto é pequeno.
