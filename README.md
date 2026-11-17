# Tech Challenge 4

App mobile (Expo / React Native) de posts educacionais para alunos e professores. Todos leem e buscam posts. Professores criam, editam e excluem os próprios posts, e o admin gerencia qualquer post. Os dados vêm da API do Tech Challenge 3.

## Pré-requisitos

- Node.js e npm
- App **Expo Go** no celular (mesma rede Wi-Fi do computador)
- API do Tech Challenge 3 rodando e acessível na rede local:

  ```bash
  # no projeto techchallenge-3
  npx next dev -H 0.0.0.0
  ```

  A API precisa ter os ajustes usados por este app: campo `category` nos posts, busca `q` também pelo nome do autor, posts ordenados do mais novo para o mais antigo e `user` (`id`, `name`, `role`, `authorId`) na resposta do login.

## Configuração

```bash
npm install
cp .env.example .env
```

No `.env`, troque o IP pelo IP do seu computador na rede local (no Windows, `ipconfig`). `localhost` não funciona no celular.

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

## Comandos

```bash
npx expo start      # servidor de desenvolvimento (escaneie o QR code no Expo Go)
npm start           # o mesmo, via túnel (quando o celular não está na mesma rede)
npm test            # testes unitários (Jest)
npx expo lint       # lint
npx tsc --noEmit    # checagem de tipos
```

## Telas

| Rota | Tela |
|---|---|
| `/` | Lista de posts com busca por título, texto e autor |
| `/post/[id]` | Post completo; editar e excluir para o dono ou admin; comentários (veja abaixo) |
| `/post/novo` | Criar post (professor) |
| `/post/[id]/editar` | Editar post |
| `/login` | Login com a mesma conta do site do Tech Challenge 3; cadastro de estudante ("Cadastre-se") |
| `/perfil` | Meus dados: nome, e-mail e troca de senha (só estudante) |
| `/admin` | Painel com abas Professores, Estudantes e Posts (só ADMIN) |
| `/admin/novo` | Cadastrar professor (só ADMIN) |
| `/admin/[id]/renomear` | Renomear professor (só ADMIN) |
| `/admin/estudante/[id]/editar` | Editar nome e e-mail do estudante (só ADMIN) |

## Comentários

Embaixo do post, qualquer pessoa lê os comentários. O estudante logado comenta e edita ou exclui os próprios comentários. O professor dono do post e o admin excluem qualquer comentário dele. Quem já estava logado antes desta versão precisa sair e entrar de novo para comentar.

## Cadastro de estudante

Na tela Entrar, "Não tem conta? Cadastre-se" abre a etapa **Criar conta** (nome, e-mail, senha e repetir senha). O estudante escolhe a própria senha, sem senha padrão e sem primeiro acesso, e já sai logado. Estudante só lê posts. Não há confirmação de e-mail.

Depende de `POST /api/student` na API do Tech Challenge 3.

Logado, o estudante abre **Meus dados** pelo menu do avatar para editar nome e e-mail e trocar a senha. Trocar o e-mail ou a senha pede a senha atual. Depende de `GET` e `PUT /api/student/me`.

## Área de administração

Quem entra com uma conta **ADMIN** vai direto para o **Painel** (`/admin`), onde lista, cadastra, renomeia e remove professores. Aluno e professor não conseguem abrir o Painel: o app manda de volta para a lista de posts.

- Professor pode ser **desativado**: não entra mais no app nem no site, e os posts dele continuam publicados. Dá para **reativar** depois. No Painel, inativos aparecem apagados, no fim da lista.
- **Remover** só aparece para quem não tem posts.
- Remover um professor apaga também a conta de login dele.
- A aba **Estudantes** lista nome e e-mail de quem se cadastrou. Tocando num estudante, o admin edita nome e e-mail (a senha não muda), **reseta a senha** (no próximo login o estudante usa a senha padrão e cria outra no primeiro acesso) ou exclui a conta. Rotas: `GET /api/student`, `PUT` e `DELETE /api/student/[id]`, `POST /api/student/[id]/reset-password`, todas restritas ao ADMIN.
- A aba **Posts** lista todos os posts publicados. Tocando num post, o admin edita (abre o mesmo modal de edição do professor) ou exclui.
- Professor novo entra com a senha padrão da escola (`DEFAULT_TEACHER_PASSWORD` na API) e cria a própria senha no primeiro acesso, pelo app.

Depende dos ajustes da API do Tech Challenge 3: `postCount` em `GET /api/author`, 409 em `DELETE /api/author/:id` quando há posts, 401 (sem sessão) / 403 (sem permissão) nas rotas de escrita, `PATCH /api/author/:id/status` para desativar e reativar, `POST /api/author` só com nome e e-mail, `FIRST_ACCESS_REQUIRED` no login e `POST /api/auth/first-access`.

## Estrutura

```
src/app/         telas (Expo Router)
src/components/  peças visuais
src/hooks/       carregamento de dados
src/api/         chamadas HTTP à API
src/auth/        sessão e login
src/lib/         regras puras (com testes)
src/theme.ts     cores, matérias, fontes
```

Design e plano: `docs/superpowers/specs/` e `docs/superpowers/plans/`.
