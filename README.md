# Tech Challenge 4

App mobile de posts para escola, feito com Expo e React Native. Aluno lê e comenta. Professor escreve. Admin cuida de tudo.

Os dados vêm da API do Tech Challenge 3 (`../techchallenge-3`).

## O que o app faz

| Quem | Pode |
|---|---|
| Qualquer pessoa | Ver a lista de posts, buscar por título, texto ou autor e ler o post inteiro com os comentários |
| Estudante | Criar conta, comentar, editar e excluir os próprios comentários, editar os próprios dados e trocar a senha |
| Professor | Criar, editar e excluir os próprios posts e excluir comentários dos próprios posts |
| Admin | Gerenciar professores, estudantes e qualquer post ou comentário |

Telas de criar, editar e de admin só abrem com login. Sem permissão, o app volta para a lista de posts.

## Como rodar

Você precisa de Node.js, npm e do app Expo Go no celular. O celular e o PC ficam na mesma rede Wi-Fi.

1. Suba a API do Tech Challenge 3 no Docker. Ela precisa do `.env` com `DEFAULT_TEACHER_PASSWORD` (veja o README de lá).

   ```bash
   cd ../techchallenge-3
   docker compose up -d --build
   ```

   A API fica na porta 3000.

2. Instale e configure este app:

   ```bash
   npm install
   cp .env.example .env
   ```

   No `.env`, coloque o IP do seu PC na rede (no Windows, rode `ipconfig`). `localhost` não funciona no celular.

   ```
   EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
   ```

3. Rode o app e leia o QR code no Expo Go:

   ```bash
   npx expo start
   ```

   Se o celular não estiver na mesma rede, use `npm start`, que abre um túnel.

O login usa as mesmas contas do site do Tech Challenge 3.

## Comandos

```bash
npx expo start      # app em modo dev
npm start           # o mesmo, via túnel
npm test            # testes (Jest)
npx expo lint       # lint
npx tsc --noEmit    # checa os tipos
```

## Telas

| Rota | Tela |
|---|---|
| `/` | Lista de posts com busca |
| `/post/[id]` | Post inteiro e comentários |
| `/post/novo` | Novo post (professor) |
| `/post/[id]/editar` | Editar post (dono ou admin) |
| `/login` | Entrar ou criar conta de estudante |
| `/perfil` | Meus dados do estudante e do professor |
| `/admin` | Painel com abas Professores, Estudantes e Posts (admin) |
| `/admin/novo` | Cadastrar professor (admin) |
| `/admin/[id]/renomear` | Editar professor (admin) |
| `/admin/estudante/[id]/editar` | Editar estudante (admin) |

## Como funciona

### Contas e login

O estudante cria a conta em "Não tem conta? Cadastre-se", na tela Entrar. Ele escolhe a senha e já entra logado. Não há confirmação de e-mail.

Em Meus dados, pelo menu do avatar, o estudante e o professor mudam nome, e-mail e senha. Para mudar e-mail ou senha, o app pede a senha atual.

Professor novo recebe a senha padrão da escola. No primeiro login, o app pede que ele crie a própria senha.

A sessão fica guardada no aparelho com `expo-secure-store`. Se a API responder 401, o app sai da conta.

### Comentários

Ficam embaixo do post. Todo mundo lê. Só estudante logado comenta. O professor dono do post e o admin podem apagar qualquer comentário daquele post. Quem entrou antes da versão com comentários precisa sair e entrar de novo para comentar.

### Painel do admin

O admin entra direto no Painel. Lá ele tem três abas.

- Professores: cadastrar, renomear, desativar, reativar e remover. Professor desativado não entra mais, mas os posts dele continuam no ar. Só dá para remover quem não tem posts, e a conta de login vai junto.
- Estudantes: editar nome e e-mail, resetar a senha (o estudante volta para a senha padrão e cria outra no próximo login) ou excluir a conta.
- Posts: editar ou excluir qualquer post.

## Rotas da API usadas

O app depende destas rotas do Tech Challenge 3:

- Posts: `GET /api/post` (busca `q` também pelo autor, mais novos primeiro), criar, editar e excluir.
- Login: `POST /api/auth/login` (volta `user` com `id`, `name`, `role` e `authorId`; avisa `FIRST_ACCESS_REQUIRED`) e `POST /api/auth/first-access`. Meus dados do professor: `GET` e `PUT /api/author/me`.
- Professores: `GET /api/author` (com `postCount`), `POST /api/author`, `PATCH /api/author/:id/status` e `DELETE /api/author/:id` (409 se tiver posts).
- Estudantes: `POST /api/student`, `GET` e `PUT /api/student/me`, e para o admin `GET /api/student`, `PUT` e `DELETE /api/student/[id]` e `POST /api/student/[id]/reset-password`.

Sem sessão, as rotas de escrita dão 401. Sem permissão, 403. Erro em dado digitado volta como 400 com o campo errado.

## Pastas

```
src/app/         telas (Expo Router)
src/components/  peças visuais
src/hooks/       carga de dados
src/api/         chamadas à API
src/auth/        sessão e login
src/lib/         regras puras, com testes
src/theme.ts     cores, matérias e fontes
```

Specs e planos de cada parte ficam em `docs/superpowers/`.
