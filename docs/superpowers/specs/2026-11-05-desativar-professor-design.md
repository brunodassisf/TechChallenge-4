# Tech Challenge 4: desativar professor (design)

Data: 2026-11-05
Status: aprovado em conversa
Depende de: `2026-11-03-area-admin-design.md` (Painel já implementado)

## Objetivo

O ADMIN passa a **desativar e reativar** professores. Professor desativado não entra mais no app nem no site, e os posts dele continuam publicados com o nome dele. A remoção definitiva continua existindo só para quem não tem posts.

### Critérios de sucesso

- No Painel, professor inativo aparece apagado, com a etiqueta "Inativo", depois dos ativos.
- O subtítulo conta os inativos: "5 professores cadastrados · 1 inativo".
- As ações oferecidas seguem a tabela abaixo.
- Desativar pede confirmação; reativar é direto. Os dois mostram aviso ("Professor desativado" / "Professor reativado").
- `npm test`, `npx tsc --noEmit` e `npx expo lint` passam.

## API (Tech Challenge 3, já implementada)

- `GET /api/author` → cada item ganha `active: boolean`.
- `PATCH /api/author/:id/status` (admin), body `{ active: boolean }` → 200 `{ data: AuthorSummary, message }`. Erros: 400 corpo inválido, 401 sem sessão, 403 sem ser admin, 404 autor inexistente, 409 `{ error }` quando o professor não tem conta de login. Repetir a ação não é erro.
- Login de conta desativada → 403 `{ error: "Conta desativada. Fale com a coordenação." }`.
- Token de conta desativada deixa de valer → rotas de escrita respondem 401.
- `DELETE /api/author/:id` com posts → 409, agora com a mensagem "Este professor tem N posts. Desative o professor para manter os posts publicados."

## Ações por situação

| Situação | Opções no sheet |
|---|---|
| Ativo, com posts | Renomear · Desativar professor |
| Ativo, sem posts | Renomear · Desativar professor · Remover professor |
| Inativo, com posts | Renomear · Reativar professor |
| Inativo, sem posts | Renomear · Reativar professor · Remover professor |

Regra numa função pura `authorActions(author)`.

## Telas

- **Linha do professor:** inativo com opacidade reduzida e etiqueta "Inativo" ao lado do nome.
- **Confirmação de desativar:** "Desativar {nome}?" + "A pessoa não consegue mais entrar no app nem no site. Os posts continuam publicados. Dá para reativar depois." + botão "Desativar professor" + "Cancelar".
- **Reativar:** sem confirmação; aviso "Professor reativado".
- **Remover com 409** (alguém publicou nesse meio-tempo): o sheet bloqueado diz "Esta pessoa tem **N posts**. Desative o professor para manter os posts publicados." e ganha o botão "Desativar professor", que desativa direto (o texto já explica o efeito), além de "Cancelar".

## Erros

| Situação | Comportamento |
|---|---|
| 401 | Sai da conta e abre o login (já existe) |
| 403 / 409 (sem conta de login) / outros | Alerta com a mensagem da API |
| 404 | Alerta "Professor não encontrado" e a lista recarrega |
| Lista sem `active` (API antiga) | Professor tratado como ativo |

O login do professor desativado já mostra a mensagem 403 da API, então a tela de login não muda.

## Testes

- `listAuthors`: `active` ausente vira `true`; `setAuthorActive` envia `PATCH` com `{ active }` e devolve o `data` normalizado.
- `sortAuthors`: ativos primeiro, mantendo a ordem da API em cada grupo.
- `teacherCountLabel` com e sem inativos (0, 1, N).
- `authorActions` nas quatro situações da tabela.

## Fora do escopo

Ocultar posts de quem está inativo, transferir posts, anonimizar dados, filtro "só inativos".
