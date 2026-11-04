# Tech Challenge 4: área de administração (design)

Data: 2026-11-03
Status: aprovado
Depende de: `2026-11-02-app-posts-design.md` (app de posts já implementado)

## Objetivo

Quando quem entra no app tem papel **ADMIN**, o app leva para uma área própria, acessível só ao ADMIN, onde ele **lista, cadastra, renomeia e remove professores**. O admin também pode abrir a lista de posts e voltar ao Painel.

### Critérios de sucesso

- Login como ADMIN abre o Painel; abrir o app já logado como ADMIN também.
- Aluno, professor e visitante não conseguem ficar no Painel (por link ou por troca de conta): voltam para a lista de posts.
- O Painel lista professores com nome, quantidade de posts e mês/ano de cadastro.
- O admin cadastra (nome, e-mail, senha), renomeia e remove professores; erros da API aparecem de forma legível.
- Professor com posts não pode ser removido: o app explica por quê e não oferece o botão.
- `npm test`, `npx tsc --noEmit` e `npx expo lint` passam.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Escopo | Listar, cadastrar, renomear e remover professores |
| Remover professor com posts | Bloqueado (app e API); a API responde 409 com `postCount` |
| Conta de login ao remover | A API apaga o `User` junto com o `Author` |
| Navegação do admin | Painel é a tela inicial do admin; "Ver posts" abre a lista; menu das iniciais tem "Painel" |
| Lista de professores na API | Continua pública (o site usa para filtro; só tem nomes, que já são públicos nos posts) |
| Proteção da área | `Stack.Protected` do Expo Router com `guard` = usuário é ADMIN; a API protege as escritas |
| Cor da área | Lilás `#C3A6FF` (`colors.admin`) em destaques, botão flutuante e botões primários |

## Dependências na API (Tech Challenge 3)

Feitas por prompt separado no repositório `techchallenge-3`:

1. `DELETE /api/author/:id`: 409 `{ error, postCount }` quando o professor tem posts; sem posts, apaga `Author` e `User` numa transação.
2. `GET /api/author`: cada item ganha `postCount`; ordenado por nome; continua público.
3. Rotas de escrita de autor e de post: **401** sem sessão, **403** com sessão sem permissão.
4. Id que não é ObjectId → 404 em JSON.

Contrato usado pelo app:

```ts
type AuthorSummary = {
  id: string;
  name: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  postCount: number;
};

type AuthorInput = { name: string; email: string; password: string };
```

Rotas:
- `GET /api/author` → `AuthorSummary[]`
- `POST /api/author` (admin) body `AuthorInput` → 201 `{ data, message }`; 400 `{ errors: { name?, email?, password? } }`; 409 `{ error: "Já existe uma conta com esse e-mail." }`
- `PUT /api/author/:id` (admin) body `{ name }` → 200 `{ data, message }`; 400 `{ error }`; 404
- `DELETE /api/author/:id` (admin) → 200 `{ message }`; 409 `{ error, postCount }`; 404

Validação da API ao cadastrar: nome obrigatório, e-mail válido, senha com no mínimo 8 caracteres.

## Navegação

```
/admin                 Painel (lista de professores)          [protegida: ADMIN]
/admin/novo            Cadastrar professor (modal)            [protegida: ADMIN]
/admin/[id]/renomear   Renomear professor (modal)             [protegida: ADMIN]
```

- `src/app/_layout.tsx` envolve as três telas em `<Stack.Protected guard={user?.role === 'ADMIN'}>`. Sem acesso, o Expo Router manda para a tela âncora (`/`), e remove essas telas do histórico se o guard virar `false` (ex.: o admin sai da conta).
- **Depois do login:** `signIn` passa a devolver o `SessionUser`. A tela de login fecha o modal e, se o usuário for ADMIN, navega para `/admin` (`router.dismissTo('/admin')`); senão, volta como hoje.
- **Ao abrir o app já logado:** depois de restaurar a sessão, se o usuário for ADMIN, o layout raiz faz `router.replace('/admin')` uma única vez.
- **"Ver posts"** no Painel: `router.push('/')`.
- **Menu das iniciais** na lista de posts: para ADMIN, o alerta ganha a opção "Painel" (`router.dismissTo('/admin')`) além de "Sair" e "Cancelar".
- A regra "para onde vai quem acabou de entrar" fica numa função pura `homeRouteFor(user)` → `'/admin'` para ADMIN, `'/'` para os demais.

## Telas

Mockups aprovados: `.superpowers/brainstorm/624-1793714891/content/admin-screens.html`.

1. **Painel** (`/admin`):
   - Topo: pílula "📚 Ver posts" à esquerda; à direita, círculo amarelo com as iniciais do admin (toque → alerta com "Sair" e "Cancelar").
   - Etiqueta lilás "Administração", título "Professores", subtítulo "N professores cadastrados" ("1 professor cadastrado" no singular).
   - Lista de professores: quadrado com as iniciais, na cor de uma paleta fixa (as cores das matérias, escolhidas pela posição na lista); nome; linha "12 posts · desde mar 2026" ("Nenhum post" / "1 post").
   - Botão flutuante lilás "＋ Professor".
   - Estados: carregando (3 blocos pulsando), erro ("Sem conexão com o servidor" + "Tentar de novo"), vazio ("Nenhum professor cadastrado" + "Cadastre o primeiro pelo botão abaixo."). Puxar para baixo recarrega; recarrega também ao voltar para a tela.
   - Toast depois de ações: "Professor cadastrado", "Nome atualizado", "Professor removido".
2. **Ações do professor**: bottom sheet com nome e a linha de posts, "✎ Renomear", "🗑 Remover professor" (vermelho) e "Cancelar".
3. **Cadastrar** (`/admin/novo`): campos Nome, E-mail (teclado de e-mail, sem maiúscula automática), Senha inicial (oculta) com a dica "Mínimo de 8 caracteres. Passe a senha para o professor, que entra com ela no app e no site."; botão lilás "Cadastrar". Erros `errors` embaixo de cada campo; `error` (ex.: e-mail repetido) no topo.
4. **Renomear** (`/admin/[id]/renomear`): campo Nome pré-preenchido, dica "O novo nome aparece em todos os posts dessa pessoa.", botão "Salvar". O nome atual vem por parâmetro de rota (`name`) junto com o `id`, sem nova chamada à API.
5. **Remover**:
   - Se `postCount > 0` (pela lista): sheet "Remover {nome}?" com aviso laranja "Esta pessoa tem **N posts**. Exclua ou transfira os posts antes de removê-la." e só o botão "Entendi".
   - Se `postCount === 0`: sheet "Remover {nome}?" com "A conta de login dele também será apagada. Não dá para desfazer.", "Remover professor" (vermelho) e "Cancelar".
   - Se a API ainda assim responder 409 (alguém criou um post nesse meio-tempo): o sheet troca para a versão bloqueada com o `postCount` da resposta.

Reaproveita os componentes existentes: `Field`, `PrimaryButton` (ganha `tone="admin"`), `IconButton`, `ConfirmSheet` (passa a aceitar conteúdo customizado), `StateMessage`, `SkeletonCard`, `Toast`.

## Arquitetura

```
src/api/authors.ts            listAuthors, createAuthor, renameAuthor, deleteAuthor
src/api/types.ts              + AuthorSummary, AuthorInput
src/lib/admin.ts              isAdmin, homeRouteFor, postCountLabel, removalBlockedMessage
src/lib/formatDate.ts         + formatMonthYear ("mar 2026")
src/hooks/useAuthors.ts       lista com status/erro/recarregar (mesmo padrão do usePosts)
src/components/AuthorRow.tsx  item da lista
src/components/AuthorActionsSheet.tsx
src/components/RemoveAuthorSheet.tsx
src/app/admin/index.tsx       Painel
src/app/admin/novo.tsx        Cadastrar
src/app/admin/[id]/renomear.tsx  Renomear
src/app/_layout.tsx           + Stack.Protected + redirecionamento inicial do admin
src/app/login.tsx             + destino por papel depois do login
src/app/index.tsx             + opção "Painel" no menu das iniciais para ADMIN
src/auth/AuthContext.tsx      signIn devolve SessionUser
src/theme.ts                  + colors.admin
```

Todas as chamadas autenticadas usam `useRequireToken()` (sessão vencida → login) e `useHandleApiError()` (401 → sair e abrir o login), como as telas de post.

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| Sem rede / timeout / resposta inválida | Estado de erro com "Tentar de novo" (lista) ou aviso no topo (formulários) |
| 400 com `errors` | Mensagens embaixo dos campos |
| 400 com `error` / 409 no cadastro | Aviso no topo do formulário |
| 401 | Sai da conta e abre o login |
| 403 | Aviso com a mensagem da API |
| 404 ao renomear/remover | Aviso "Professor não encontrado" e a lista recarrega |
| 409 ao remover | Sheet bloqueado com o `postCount` da resposta |

## Testes

- **Unitários:** `isAdmin`, `homeRouteFor` (admin, professor, aluno, deslogado), `postCountLabel` (0, 1, N), `removalBlockedMessage` (1 post / N posts), `formatMonthYear` (data válida e inválida), `listAuthors` (resposta que não é lista vira erro), `deleteAuthor` com 409 expõe `postCount`.
- **Manual no Expo Go:** login como admin abre o Painel; reabrir o app logado abre o Painel; "Ver posts" e voltar pelo menu; cadastrar com e-mail inválido, senha curta e e-mail repetido; cadastrar certo; renomear; remover professor sem posts; tentar remover professor com posts; aluno tentando abrir `/admin` por link; sair da conta estando no Painel.

## Fora do escopo

Transferir posts entre professores, editar e-mail ou senha de professor, gerenciar alunos, paginação e busca na lista de professores.
