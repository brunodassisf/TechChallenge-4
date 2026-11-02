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
| `/post/[id]` | Post completo; editar e excluir para o dono ou admin |
| `/post/novo` | Criar post (professor) |
| `/post/[id]/editar` | Editar post |
| `/login` | Login com a mesma conta do site do Tech Challenge 3 |

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
