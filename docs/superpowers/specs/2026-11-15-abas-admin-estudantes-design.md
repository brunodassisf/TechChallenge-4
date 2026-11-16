# Tech Challenge 4: abas Professores e Estudantes no admin (design)

Data: 2026-11-15
Status: aguardando revisão

## Objetivo

O admin vê, na mesma tela, a lista de professores e a lista de estudantes, alternando por abas.

### Critérios de sucesso

- O cabeçalho do painel admin tem o seletor **Professores | Estudantes**. A aba inicial é Professores.
- A aba Professores continua igual a hoje (lista, ações, botão "＋ Professor").
- A aba Estudantes lista nome e e-mail de cada estudante, em ordem alfabética, com puxar para atualizar.
- Na aba Estudantes não aparece o botão "＋ Professor".
- `npm test`, `npx tsc --noEmit` e `npx expo lint` passam.

### Fora do escopo

Paginação, busca, editar e excluir estudante (o restante do RF08.3 fica para uma próxima entrega).

## API (Tech Challenge 3)

`GET /api/student` usa o token da sessão (`Authorization: Bearer`).

- Sem sessão: 401 `{ error: "Você precisa estar logado." }`.
- Quem não é ADMIN: 403 `{ error: "Apenas administradores podem ver os estudantes." }`.
- 200: `[{ id, name, email, createdAt }]`, ordenado por nome. `id` é o do Student e `email` vem do User ligado a ele.

O `POST /api/student` (cadastro público) continua igual. O TC-3 não tem testes automatizados, então a rota é conferida à mão (curl com token de admin, de estudante e sem token).

## App

- `src/api/types.ts`: tipo `StudentSummary = { id, name, email, createdAt }`.
- `src/api/students.ts`: `listStudents(token)`. Lança `ApiError(200, INVALID_RESPONSE)` se a resposta não for array, como o `listAuthors`.
- `src/hooks/useStudents.ts`: mesmo formato do `useAuthors` (`status`, `students`, `error`, `refreshing`, `reload`), usando `createLatest` para descartar respostas antigas. Recebe o token de `useRequireToken`. Um 401 vai para `useHandleApiError`, que desloga.
- `src/components/StudentRow.tsx`: avatar com iniciais (`avatarColor(index)`), nome e e-mail. Não é clicável.
- `src/app/admin/index.tsx`:
  - estado `tab: 'professores' | 'estudantes'`;
  - seletor de duas opções no cabeçalho, com `accessibilityRole="tab"` e `accessibilityState={{ selected }}`;
  - título e subtítulo mudam por aba (subtítulo dos estudantes: "N estudante(s)");
  - a aba ativa recarrega ao ser aberta e no foco da tela (a de estudantes só busca quando está ativa);
  - estados da aba Estudantes: esqueleto ao carregar, "Nenhum estudante cadastrado" quando vazio, "Sem conexão com o servidor" com "Tentar de novo" em caso de erro.

## Testes

- `src/api/students.test.ts`: `listStudents` manda o token, devolve a lista e falha quando a resposta não é array.
- Rota do TC-3: conferência manual (ver acima).
