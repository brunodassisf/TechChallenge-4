# Tech Challenge 4: primeiro acesso do professor (design)

Data: 2026-11-06
Status: aguardando revisão
Depende de: `2026-11-03-area-admin-design.md` (Painel e cadastro já implementados)

## Objetivo

O ADMIN cadastra o professor sem digitar senha, e a conta nasce com a senha padrão da escola. No primeiro login, o professor cria a própria senha e entra no app.

### Critérios de sucesso

- O cadastro em `/admin/novo` pede só nome e e-mail.
- Professor que entra com a senha padrão vê a etapa "Crie sua senha", com os campos "Nova senha" e "Repetir senha".
- Depois de salvar, ele já está logado, sem digitar a senha de novo.
- A senha padrão fica só na memória da tela de login. Nada dela é gravado no aparelho.
- Quem já tem senha própria entra como antes.
- `npm test`, `npx tsc --noEmit` e `npx expo lint` passam.

## API (Tech Challenge 3, já implementada)

- `POST /api/author` (admin): body `{ name, email }`.
- `POST /api/auth/login` em primeiro acesso → 403 `{ error, code: "FIRST_ACCESS_REQUIRED" }`, sem token.
- `POST /api/auth/first-access` (pública): body `{ email, currentPassword, password, confirmPassword }` → 200 com o mesmo formato do login. Erros:
  - 400 `{ errors }`: corpo inválido, senhas diferentes, menos de 8 caracteres, ou nova senha igual à padrão.
  - 401 `{ error }`: e-mail ou senha atual errados.
  - 403 `{ error }`: conta desativada.
  - 409 `{ error }`: a senha já foi definida.

## Fluxo

1. O professor digita e-mail e senha padrão na tela de login.
2. A API responde `FIRST_ACCESS_REQUIRED`, e a tela troca para a etapa "Crie sua senha". O e-mail e a senha digitados ficam guardados no estado da tela.
3. O professor preenche as duas senhas e toca em "Salvar e entrar".
4. O app chama `first-access`, grava a sessão como no login e fecha a tela. Ele volta para onde abriu o login, como acontece hoje.

A etapa fica dentro de `/login`, e não em uma rota nova, para a senha padrão não passar por parâmetro de rota.

## Telas

**Cadastro (`/admin/novo`):** sai o campo "Senha inicial". A dica passa a ser "O professor entra com a senha padrão da escola e cria a própria senha no primeiro acesso."

**Etapa "Crie sua senha" (em `/login`):**

- Botão "‹" no lugar do "✕", que volta para a etapa de login.
- Título "Crie sua senha".
- Texto "Primeiro acesso de {email}. Esta será sua senha no app e no site."
- Campos "Nova senha" e "Repetir senha", com texto oculto.
- Dica "Mínimo de 8 caracteres."
- Botão "Salvar e entrar", com carregamento.

## Validação no aparelho

Antes de chamar a API, uma função pura confere as duas regras, usando os mesmos textos da API e tirando espaços das pontas, como ela faz:

- menos de 8 caracteres → "A senha deve ter pelo menos 8 caracteres." em "Nova senha";
- senhas diferentes → "As senhas não coincidem." em "Repetir senha".

A regra "diferente da senha padrão" fica só na API.

## Erros

| Situação | Comportamento |
|---|---|
| Login com `FIRST_ACCESS_REQUIRED` | Abre a etapa "Crie sua senha" |
| Login com outro erro | Como hoje |
| `first-access` 400 em `password` ou `confirmPassword` | Mensagem embaixo do campo |
| `first-access` 400 em outro campo | Mensagem da API no topo da etapa |
| `first-access` 401, 403 ou 409 | Volta para a etapa de login, com a mensagem da API e o campo de senha vazio |
| Sem conexão ou erro 5xx | Mensagem no topo da etapa; os campos ficam preenchidos para tentar de novo |

## Peças

- `src/api/auth.ts`: `firstAccess(input)` e `isFirstAccessRequired(err)`.
- `src/api/types.ts`: `AuthorInput` perde `password`; novo `FirstAccessInput`.
- `src/auth/AuthContext.tsx`: `completeFirstAccess(input)`, que grava a sessão pelo mesmo caminho de `signIn`.
- `src/lib/firstAccess.ts`: regras puras `validateNewPassword(password, confirm)` e `restartsLogin(err)`.
- `src/components/FirstAccessForm.tsx`: a etapa, com props `email`, `currentPassword`, `onDone`, `onRestart` e `onBack`.
- `src/app/login.tsx`: alterna entre as duas etapas.
- `src/app/admin/novo.tsx`: sem o campo de senha.
- `README.md`: primeiro acesso e dependência da API.

## Testes

- `isFirstAccessRequired`: verdadeiro só para 403 com o código; falso para 403 de conta desativada e para outros erros.
- `firstAccess`: envia `POST` com os quatro campos e o e-mail sem espaços nas pontas.
- `createAuthor`: o corpo enviado tem só `name` e `email`.
- `validateNewPassword`: senha curta, só espaços, senhas diferentes, e caso válido.
- `restartsLogin`: verdadeiro para 401, 403 e 409; falso para 400, 500, sem conexão e erro que não é `ApiError`.

## Fora do escopo

Recuperação de senha, redefinição pelo admin, senha temporária individual, mostrar no Painel quem ainda não fez o primeiro acesso, e primeiro acesso no site.
