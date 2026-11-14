# Tech Challenge 4: cadastro de estudante (design)

Data: 2026-11-13
Status: aguardando revisão
Depende de: `2026-11-06-primeiro-acesso-professor-design.md` (etapas dentro de `/login` e regra de senha)

## Objetivo

O estudante cria a própria conta pela tela Entrar, já escolhendo a senha, e sai logado.

### Critérios de sucesso

- A tela Entrar tem o link "Não tem conta? Cadastre-se".
- O link abre a etapa "Criar conta", com os campos Nome, E-mail, Senha e Repetir senha.
- Depois de criar a conta, o estudante já está logado e volta para a lista de posts.
- O estudante novo só lê posts, como os estudantes de hoje.
- `npm test`, `npx tsc --noEmit` e `npx expo lint` passam.

## API (Tech Challenge 3, a implementar pelo prompt)

`POST /api/student`, pública, com body `{ name, email, password, confirmPassword }`:

- 201 com o mesmo formato do login: `message`, `token`, `tokenType`, `expiresAt` e `user` (com `role: "STUDENT"` e `authorId: null`).
- 400 `{ errors }`: nome vazio, e-mail inválido, senha com menos de 8 caracteres ou senhas diferentes.
- 409 `{ error: "Já existe uma conta com esse e-mail." }`.

## Fluxo

1. Na tela Entrar, o estudante toca em "Não tem conta? Cadastre-se".
2. A tela troca para a etapa "Criar conta".
3. Ele preenche os quatro campos e toca em "Criar conta".
4. O app confere os campos, chama a API, grava a sessão como no login e fecha a tela.

A etapa fica dentro de `/login`, como a etapa "Crie sua senha", e reaproveita a navegação de saída que já existe.

## Tela "Criar conta"

- Botão "‹", que volta para a etapa de login.
- Título "Criar conta".
- Texto "Para estudantes. Professores recebem o acesso da coordenação."
- Campos "Nome", "E-mail", "Senha" e "Repetir senha". As senhas ficam ocultas.
- Dica "Mínimo de 8 caracteres."
- Botão "Criar conta", com carregamento.

## Validação no aparelho

Antes de chamar a API:

- nome vazio, mesmo depois de tirar os espaços → "Informe o nome." em "Nome";
- senha com menos de 8 caracteres → "A senha deve ter pelo menos 8 caracteres." em "Senha";
- senhas diferentes → "As senhas não coincidem." em "Repetir senha".

As duas regras de senha são as de `validateNewPassword`, que já existe. O formato do e-mail fica com a API.

## Erros

| Situação | Comportamento |
|---|---|
| 400 em `name`, `email`, `password` ou `confirmPassword` | Mensagem embaixo do campo |
| 400 em outro campo | Primeira mensagem da API no topo |
| 409 e-mail já usado | Mensagem da API no topo |
| Sem conexão ou erro 5xx | Mensagem no topo; os campos ficam preenchidos |

## Peças

- `src/api/types.ts`: `SignUpInput`.
- `src/api/auth.ts`: `signUp(input)`, que tira espaços das pontas de nome e e-mail.
- `src/auth/AuthContext.tsx`: `signUp(input)`, que grava a sessão pelo mesmo caminho do login.
- `src/lib/signUp.ts`: `validateSignUp(input)`.
- `src/lib/firstAccess.ts`: a regra que manda para o topo os erros de campos fora da tela passa a receber a lista de campos, para servir às duas etapas.
- `src/components/SignUpForm.tsx`: a etapa, com props `onDone` e `onBack`.
- `src/app/login.tsx`: o estado da tela passa de `firstAccess: boolean` para `step: 'login' | 'firstAccess' | 'signUp'`, e ganha o link.
- `README.md`: cadastro de estudante e dependência da API.

## Testes

- `signUp`: envia `POST /api/student` com os quatro campos, nome e e-mail sem espaços nas pontas, e devolve a resposta.
- `validateSignUp`: nome vazio, nome só com espaços, senha curta, senhas diferentes, e caso válido.
- Regra de erros por campos: campo mostrado fica no campo; campo fora da lista sobe para o topo; os testes atuais do primeiro acesso continuam passando.

## Fora do escopo

Confirmação de e-mail, cadastro de estudante no site, gestão de estudantes pelo admin (RF08), limite de tentativas de cadastro e e-mail sem diferença de maiúsculas.

## Risco aceito

O cadastro é aberto e sem confirmação de e-mail, então qualquer pessoa cria conta com qualquer e-mail. Estudante só lê posts, então isso não dá acesso de escrita.
