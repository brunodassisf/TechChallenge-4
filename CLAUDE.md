# Projeto
App Expo (TC-4) que consome a API do TC-3 (`../techchallenge-3`, Next.js no Docker, porta 3000). Regras do Expo: AGENTS.md.

# Convenções
- Fluxo superpowers: spec → plano → execução inline no master, um commit por tarefa.
- Push só com ok do usuário. Só usar subagentes se o usuário pedir.
- Nunca escrever o valor real da senha padrão (código, docs, Postman).
- API: erro de dado do usuário é 400 por campo, nunca 401 (`useHandleApiError` desloga em 401).
- Erro de campo que a tela não mostra sobe para o topo: `stepFormError(err, campos)`.

# Comandos
npm test · npx tsc --noEmit · npx expo lint · npx expo export --platform android --output-dir "$TEMP/tc4-export"

# Armadilhas
- Chamada Bash reescrita pelo hook rtk falha se for junto com outras: mandar sozinha.
- O IP do PC muda (.3/.4): conferir `.env` (EXPO_PUBLIC_API_URL) quando o celular não conectar.
