# Tech Challenge 4: app de posts educacionais (design)

Data: 2026-11-02
Status: aprovado em conversa, aguardando revisão deste documento

## Objetivo

App mobile (Expo / React Native) para uma escola, com público misto de alunos (de crianças a adultos) e professores. Esta primeira versão gira em torno de **posts**: todos podem ler, e professores criam, editam e excluem os próprios posts.

A tela inicial é uma lista de posts. Cada item mostra **título, autor, breve descrição e matéria**, e há uma busca por palavra-chave que procura em **todos os campos** do post (título, texto e nome do autor).

### Critérios de sucesso

- Lista de posts carrega da API do Tech Challenge 3 e mostra título, autor, descrição curta e matéria (cor + etiqueta).
- A busca encontra posts pelo título, pelo texto e pelo nome do autor.
- Professor logado cria, edita e exclui os próprios posts. Admin gerencia qualquer post. Aluno e visitante só leem.
- Visual da direção "Vibrante" aprovada (seção Visual), legível para todas as idades.
- `npx expo lint` e `npx tsc --noEmit` passam; testes unitários das partes com lógica passam.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Público | Misto: alunos e professores, de várias idades |
| Dados | API do Tech Challenge 3 (Next.js + Prisma + MongoDB), consumida via HTTP com token Bearer |
| Direção visual | "Vibrante": fundo escuro, cards na cor da matéria, títulos grandes |
| Título do app | "Tech Challenge 4" |
| Matéria do post | Campo novo `category` na API, lista fixa de 9 valores |
| Busca | No servidor (`GET /api/post?q=`), estendida para incluir o nome do autor |
| Estilização | `StyleSheet` do React Native + arquivo de tema; sem biblioteca de UI |
| Chamadas à API | `fetch` + hooks próprios; sem React Query |
| Docker | Fora deste escopo. Metro roda direto na máquina |

## Dependências na API (Tech Challenge 3)

O app depende de quatro ajustes na API, feitos no repositório `techchallenge-3` por um prompt separado:

1. **Campo `category`** no `Post`, enum `MATEMATICA | PORTUGUES | CIENCIAS | HISTORIA | GEOGRAFIA | INGLES | ARTES | EDUCACAO_FISICA | GERAL`, padrão `GERAL`. Opcional em `POST` (ausente → `GERAL`) e em `PUT` (ausente → mantém). Valor inválido → 400. Posts antigos recebem `GERAL` por script de backfill.
2. **Busca `q` também no nome do autor** (`authors.name`, case-insensitive).
3. **Ordenação** de `GET /api/post` por `createdAt` decrescente.
4. **Resposta do login** inclui `user: { id, name, role, authorId }` (`authorId` é `null` para quem não é professor).

Contrato usado pelo app:

```ts
type Category =
  | 'MATEMATICA' | 'PORTUGUES' | 'CIENCIAS' | 'HISTORIA' | 'GEOGRAFIA'
  | 'INGLES' | 'ARTES' | 'EDUCACAO_FISICA' | 'GERAL';

type Post = {
  id: string;
  title: string;
  text: string;
  category: Category;
  authorId: string;
  createdAt: string; // ISO
  updatedAt: string;
  authors: { id: string; name: string; userId: string | null };
};

type LoginResponse = {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: { id: string; name: string; role: 'ADMIN' | 'AUTHOR' | 'STUDENT'; authorId: string | null };
};
```

Rotas: `GET /api/post?q=`, `GET /api/post/:id`, `POST /api/post`, `PUT /api/post/:id`, `DELETE /api/post/:id`, `POST /api/auth/login`.
Erros da API: `{ error: string }` ou `{ errors: Record<campo, string[]> }` (validação, 400).

## Visual

Mockups aprovados em `.superpowers/brainstorm/417-1793627002/content/` (`home-v3.html`, `screens-crud.html`).

### Tema (`src/theme.ts`)

- Fundo: `#14123A`. Superfície elevada (sheets): `#211E52`. Texto sobre fundo: `#FFFFFF` (secundário com opacidade 0.55–0.75). Texto sobre cards coloridos: `#14123A`.
- Destaque e ação primária: `#FFD84D`. Erro/perigo: `#FF8A7A`. Sucesso (toast): `#8CF0C6`.
- Matérias (cor do card + rótulo):

| Valor | Rótulo | Cor |
|---|---|---|
| MATEMATICA | Matemática | `#FFD84D` |
| PORTUGUES | Português | `#FF9EC4` |
| CIENCIAS | Ciências | `#8CF0C6` |
| HISTORIA | História | `#FFB36B` |
| GEOGRAFIA | Geografia | `#7FD3FF` |
| INGLES | Inglês | `#C3A6FF` |
| ARTES | Artes | `#FF8A7A` |
| EDUCACAO_FISICA | Educação Física | `#B8F06A` |
| GERAL | Geral | `#E6E4F5` |

  Valor desconhecido vindo da API cai em `GERAL`.
- Fontes: **Bricolage Grotesque** (títulos, rótulos, botões; pesos 500/700/800) e **Inter** (textos corridos e campos; 400/500/700).
- Raios: cards 22, cabeçalho do post 26, campos 16, botões e pílulas 999.
- Espaçamento base: 4 (gutter lateral 16, espaço entre cards 12).

### Telas

1. **Inicial** (`/`): título "Tech Challenge" + "4" em amarelo; botão "Entrar" no topo direito (logado: iniciais do nome, toque abre opção "Sair"); campo de busca em pílula; lista de cards (etiqueta da matéria, título, descrição de 2 linhas cortada com reticências, nome do autor); botão flutuante "+ Novo post" só para `AUTHOR` e `ADMIN`.
   - Estados: carregando (3 blocos pulsando), lista, buscando (contagem "N resultados para 'x'" e termo destacado no texto visível), busca sem resultado ("Nada por aqui" + "Limpar busca"), erro ("Sem conexão com o servidor" + "Tentar de novo"), lista vazia sem busca ("Ainda não há posts").
   - Busca dispara 300 ms após parar de digitar. Puxar para baixo recarrega.
   - Descrição curta = início do `text`, com espaços e quebras de linha colapsados, limitada a 2 linhas pelo componente.
2. **Post completo** (`/post/[id]`): cabeçalho na cor da matéria (etiqueta, título, "autor · data"), texto completo em Inter 14/1.6. Dono do post (`user.authorId === post.authorId`) ou `ADMIN` vê "Editar" e lixeira.
3. **Criar** (`/post/novo`) e **Editar** (`/post/[id]/editar`): mesma tela de formulário. Campos: título, matéria (chips coloridos, seleção única, "Geral" pré-selecionado ao criar), conteúdo (multilinha). Botão "Publicar" / "Salvar". Erros de validação da API aparecem embaixo de cada campo; outros erros num aviso no topo. Ao criar, volta para a lista com o post novo no topo; ao editar, volta para o post atualizado.
4. **Excluir**: bottom sheet de confirmação ("Excluir este post?", "Excluir post" / "Cancelar"). Depois volta para a lista e mostra toast "Post excluído".
5. **Login** (`/login`, apresentado como modal): e-mail, senha, "Entrar". Mensagem da API em caso de 401. Texto de apoio: "A mesma conta do site do Tech Challenge 3."

Datas exibidas no formato "12 out 2026" (pt-BR).

## Arquitetura

```
src/app/_layout.tsx            Stack do Expo Router; carrega fontes (splash até carregar); AuthProvider
src/app/index.tsx              Tela inicial
src/app/login.tsx              Login (presentation: modal)
src/app/post/[id]/index.tsx    Post completo
src/app/post/novo.tsx          Criar post
src/app/post/[id]/editar.tsx   Editar post
src/theme.ts                   Cores, matérias, fontes, raios, espaçamentos
src/api/client.ts              fetch base: URL, header Bearer, parse de erro, ApiError
src/api/posts.ts               listPosts(q), getPost(id), createPost, updatePost, deletePost
src/api/auth.ts                login(email, password)
src/auth/AuthContext.tsx       usuário + token em memória; login, logout; restaura no início
src/auth/tokenStorage.ts       expo-secure-store (iOS/Android)
src/auth/tokenStorage.web.ts   localStorage (web)
src/hooks/usePosts.ts          lista + busca com debounce + recarregar
src/hooks/usePost.ts           um post
src/components/                PostCard, SearchBar, CategoryChips, CategoryTag,
                               StateMessage (vazio/erro), SkeletonCard, ConfirmSheet, Toast
src/lib/excerpt.ts             gera a descrição curta a partir do texto
src/lib/formatDate.ts          data em pt-BR
src/lib/highlight.ts           divide um texto em trechos com/sem o termo buscado
src/lib/post.ts                regras de permissão e nome do autor
src/lib/latest.ts              descarta respostas de buscas antigas
src/auth/session.ts            lê e valida a sessão guardada
```

Cada unidade tem uma responsabilidade: telas só compõem componentes e hooks; hooks só lidam com estado de carregamento; `src/api` só conhece HTTP; `AuthContext` é a única fonte de verdade do usuário logado.

### Fluxo de dados

- `client.ts` lê `process.env.EXPO_PUBLIC_API_URL`, adiciona `Authorization: Bearer <token>` quando há token, e transforma respostas não-2xx em `ApiError { status, message, fieldErrors? }`.
- Ao abrir o app, `AuthContext` lê token e usuário guardados. Se o `expiresAt` já passou, descarta e segue deslogado.
- Qualquer `ApiError` com status 401 em uma ação autenticada: `logout()` e navega para `/login`.
- Depois de criar, editar ou excluir, a lista é recarregada ao voltar para a tela inicial.

### Configuração

- `.env` (fora do git) com `EXPO_PUBLIC_API_URL=http://<IP da máquina na rede>:3000`; `.env.example` versionado.
- A API precisa rodar acessível na rede local (`next dev -H 0.0.0.0`), porque `localhost` no celular aponta para o próprio celular.
- Dependências novas (instaladas com `npx expo install`): `expo-secure-store`, `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/inter`. Todas funcionam no Expo Go.

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| Sem rede ou API fora do ar | Estado de erro com "Tentar de novo" |
| 400 com `errors` | Mensagens embaixo dos campos correspondentes |
| 401 | Sai da conta e abre o login |
| 403 | Aviso com a mensagem da API; botões de dono não deveriam aparecer nesse caso |
| 404 no post | Mensagem "Post não encontrado" + voltar |
| Categoria desconhecida | Tratada como `GERAL` |

## Testes

- **Unitários** (Jest via `jest-expo`): `excerpt`, `formatDate`, mapeamento de matéria (inclusive valor desconhecido), `client.ts` (montagem de URL e header, conversão de erros 400/401/404/rede), regra "pode gerenciar post" (dono, admin, aluno, deslogado).
- **Manual no Expo Go**, com a API rodando: listar; buscar por título, texto e autor; busca sem resultado; API desligada; login de aluno (sem botões de professor); login de professor; criar com e sem erro de validação; editar; excluir; sair.

## Fora do escopo

Filtro por matéria, comentários, cadastro de usuários pelo app, modo offline, paginação, suporte completo à versão web (exigiria CORS na API), Docker.
