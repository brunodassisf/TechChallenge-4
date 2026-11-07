# Primeiro acesso do professor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O ADMIN cadastra professor sem senha, e o professor cria a própria senha no primeiro login e já entra no app.

**Architecture:** A camada HTTP ganha `firstAccess` e `isFirstAccessRequired`. As regras ficam puras em `src/lib/firstAccess.ts`. A etapa "Crie sua senha" é um componente mostrado dentro de `/login`, para a senha padrão ficar só no estado da tela. O `AuthContext` grava a sessão pelo mesmo caminho do `signIn`.

**Tech Stack:** Expo SDK 57, Expo Router 57, React 19, TypeScript 6, Jest (`jest-expo`), `StyleSheet` + `src/theme.ts`.

**Spec:** `docs/superpowers/specs/2026-11-06-primeiro-acesso-professor-design.md`

## Global Constraints

- Textos exatamente como no spec: "Crie sua senha", "Primeiro acesso de {email}. Esta será sua senha no app e no site.", "Nova senha", "Repetir senha", "Mínimo de 8 caracteres.", "Salvar e entrar", "A senha deve ter pelo menos 8 caracteres.", "As senhas não coincidem.", "O professor entra com a senha padrão da escola e cria a própria senha no primeiro acesso."
- A senha padrão nunca é gravada no aparelho nem passada por parâmetro de rota.
- Antes de cada commit: `npm test`, `npx tsc --noEmit`, `npx expo lint` passam.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `README.md` e `src/app/admin/index.tsx` podem ter alterações locais do usuário. Confira `git status` e não as inclua nos commits deste plano.

## Review Focus

1. **400 em campo que a etapa não mostra** (`email`, `currentPassword`): o erro aparece no topo em vez de sumir. Teste de `firstAccessFormError` (Task 1).
2. **403 de conta desativada no login**: não abre a etapa de nova senha. Teste de `isFirstAccessRequired` (Task 1).
3. **Senha só de espaços**: é recusada como curta, igual à API. Teste de `validateNewPassword` (Task 1).
4. **Toque duplo ou Enter repetido em "Salvar e entrar"**: só uma chamada sai. Guarda `if (saving) return` (Task 3) e roteiro manual, porque não há teste de componente neste projeto.
5. **Voltar da etapa e entrar com outro e-mail**: a etapa recebe o e-mail atual, sem resto do anterior. Coberto pelo roteiro manual (Task 4).

---

### Task 1: Chamada de primeiro acesso e regras

**Files:**
- Modify: `src/api/types.ts`, `src/api/auth.ts`
- Create: `src/lib/firstAccess.ts`
- Test: `src/api/auth.test.ts`, `src/lib/firstAccess.test.ts`

**Interfaces:**
- Produces:
  - `type FirstAccessInput = { email: string; currentPassword: string; password: string; confirmPassword: string }`
  - `firstAccess(input: FirstAccessInput): Promise<LoginResponse>`
  - `isFirstAccessRequired(err: unknown): boolean`
  - `validateNewPassword(password: string, confirm: string): Record<string, string[]>`
  - `restartsLogin(err: unknown): err is ApiError`
  - `firstAccessFormError(err: unknown): FormError`

- [ ] **Step 1: Testes que falham**

`src/api/auth.test.ts`:

```ts
import { firstAccess, isFirstAccessRequired } from './auth';
import { ApiError } from './client';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
});

describe('isFirstAccessRequired', () => {
  it('403 com o código', () => {
    const err = new ApiError(403, 'Primeiro acesso', undefined, { code: 'FIRST_ACCESS_REQUIRED' });
    expect(isFirstAccessRequired(err)).toBe(true);
  });
  it('403 de conta desativada não é primeiro acesso', () => {
    const err = new ApiError(403, 'Conta desativada.', undefined, { error: 'Conta desativada.' });
    expect(isFirstAccessRequired(err)).toBe(false);
  });
  it('mesmo código com outro status não conta', () => {
    const err = new ApiError(401, 'x', undefined, { code: 'FIRST_ACCESS_REQUIRED' });
    expect(isFirstAccessRequired(err)).toBe(false);
  });
  it('corpo vazio ou erro comum não conta', () => {
    expect(isFirstAccessRequired(new ApiError(403, 'x'))).toBe(false);
    expect(isFirstAccessRequired(new Error('x'))).toBe(false);
  });
});

describe('firstAccess', () => {
  it('envia POST com os quatro campos e o e-mail sem espaços nas pontas', async () => {
    const session = { message: 'ok', token: 't', tokenType: 'Bearer', expiresAt: '2026-12-01', user: { id: 'u1' } };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => session } as Response);
    const res = await firstAccess({
      email: ' ana@x.com ',
      currentPassword: 'padrao123',
      password: 'minhasenha',
      confirmPassword: 'minhasenha',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/auth/first-access');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      email: 'ana@x.com',
      currentPassword: 'padrao123',
      password: 'minhasenha',
      confirmPassword: 'minhasenha',
    });
    expect(res).toEqual(session);
  });
});
```

`src/lib/firstAccess.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { firstAccessFormError, restartsLogin, validateNewPassword } from './firstAccess';

describe('validateNewPassword', () => {
  it('senhas válidas e iguais não têm erro', () => {
    expect(validateNewPassword('minhasenha', 'minhasenha')).toEqual({});
  });
  it('senha curta', () => {
    expect(validateNewPassword('1234567', '1234567')).toEqual({
      password: ['A senha deve ter pelo menos 8 caracteres.'],
    });
  });
  it('só espaços conta como curta', () => {
    expect(validateNewPassword('          ', '          ')).toEqual({
      password: ['A senha deve ter pelo menos 8 caracteres.'],
    });
  });
  it('senhas diferentes', () => {
    expect(validateNewPassword('minhasenha', 'outrasenha')).toEqual({
      confirmPassword: ['As senhas não coincidem.'],
    });
  });
  it('espaços nas pontas não contam, como na API', () => {
    expect(validateNewPassword(' minhasenha ', 'minhasenha')).toEqual({});
  });
});

describe('restartsLogin', () => {
  it.each([401, 403, 409])('%i volta para o login', (status) => {
    expect(restartsLogin(new ApiError(status, 'x'))).toBe(true);
  });
  it.each([0, 400, 500])('%i fica na etapa', (status) => {
    expect(restartsLogin(new ApiError(status, 'x'))).toBe(false);
  });
  it('erro que não é da API fica na etapa', () => {
    expect(restartsLogin(new Error('x'))).toBe(false);
  });
});

describe('firstAccessFormError', () => {
  it('erro em campo da etapa fica no campo', () => {
    const err = new ApiError(400, 'Confira', { password: ['Escolha uma senha diferente da senha padrão.'] });
    expect(firstAccessFormError(err)).toEqual({
      error: null,
      fieldErrors: { password: ['Escolha uma senha diferente da senha padrão.'] },
    });
  });
  it('erro em campo que a etapa não mostra vai para o topo', () => {
    const err = new ApiError(400, 'Confira', { email: ['Informe um e-mail válido.'] });
    expect(firstAccessFormError(err)).toEqual({ error: 'Informe um e-mail válido.', fieldErrors: {} });
  });
  it('sem conexão vai para o topo', () => {
    expect(firstAccessFormError(new ApiError(0, 'Sem conexão com o servidor.'))).toEqual({
      error: 'Sem conexão com o servidor.',
      fieldErrors: {},
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/api/auth src/lib/firstAccess`
Expected: FAIL (`firstAccess`, `isFirstAccessRequired` e o módulo `./firstAccess` não existem).

- [ ] **Step 3: Tipo**

Em `src/api/types.ts`, depois de `LoginResponse`:

```ts
export type FirstAccessInput = {
  email: string;
  currentPassword: string;
  password: string;
  confirmPassword: string;
};
```

- [ ] **Step 4: Chamada**

Substitua `src/api/auth.ts` inteiro:

```ts
import { ApiError, apiRequest } from './client';
import type { FirstAccessInput, LoginResponse } from './types';

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
}

export function firstAccess(input: FirstAccessInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/first-access', {
    method: 'POST',
    body: { ...input, email: input.email.trim() },
  });
}

/** Login recusado porque o professor ainda usa a senha padrão. */
export function isFirstAccessRequired(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 403) return false;
  const { body } = err;
  return !!body && typeof body === 'object' && 'code' in body && body.code === 'FIRST_ACCESS_REQUIRED';
}
```

- [ ] **Step 5: Regras**

`src/lib/firstAccess.ts`:

```ts
import { ApiError } from '@/api/client';
import { toFormError, type FormError } from './formError';

const MIN_PASSWORD = 8;
const STEP_FIELDS = ['password', 'confirmPassword'];

/** Mesmas regras da API, que também tira os espaços das pontas. */
export function validateNewPassword(password: string, confirm: string): Record<string, string[]> {
  const value = password.trim();
  const errors: Record<string, string[]> = {};
  if (value.length < MIN_PASSWORD) errors.password = ['A senha deve ter pelo menos 8 caracteres.'];
  if (value !== confirm.trim()) errors.confirmPassword = ['As senhas não coincidem.'];
  return errors;
}

/** 401, 403 e 409: a senha atual ou a conta mudou, então o login precisa recomeçar. */
export function restartsLogin(err: unknown): err is ApiError {
  return err instanceof ApiError && [401, 403, 409].includes(err.status);
}

/** Erro em campo que a etapa não mostra sobe para o topo, para não sumir. */
export function firstAccessFormError(err: unknown): FormError {
  const form = toFormError(err);
  const entries = Object.entries(form.fieldErrors);
  if (entries.length === 0 || entries.some(([field]) => STEP_FIELDS.includes(field))) return form;
  return { error: entries[0][1][0] ?? null, fieldErrors: {} };
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest src/api src/lib && npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/api src/lib
git commit -m "feat: chamada e regras do primeiro acesso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Cadastro de professor sem senha

**Files:**
- Modify: `src/api/types.ts`, `src/app/admin/novo.tsx`
- Test: `src/api/authors.test.ts`

**Interfaces:**
- Produces: `type AuthorInput = { name: string; email: string }`

- [ ] **Step 1: Teste**

Em `src/api/authors.test.ts`, acrescente `createAuthor` ao import de `./authors` e, ao fim do arquivo:

```ts
describe('createAuthor', () => {
  it('envia só nome e e-mail', async () => {
    respond(201, { data: base, message: 'ok' });
    await createAuthor({ name: 'Ana', email: 'ana@x.com' }, 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/author');
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana', email: 'ana@x.com' });
  });
});
```

- [ ] **Step 2: Ver falhar no typecheck**

Run: `npx tsc --noEmit`
Expected: FAIL em `src/api/authors.test.ts` (falta `password` em `AuthorInput`). O Jest não confere tipos, então esse teste passa em tempo de execução: aqui o sinal vermelho é o `tsc`.

- [ ] **Step 3: Tipo**

Em `src/api/types.ts`, troque `AuthorInput` por:

```ts
export type AuthorInput = { name: string; email: string };
```

- [ ] **Step 4: Formulário**

Em `src/app/admin/novo.tsx`:
- troque o estado inicial por `useState<AuthorInput>({ name: '', email: '' })`;
- troque a chamada por `await createAuthor({ name: values.name.trim(), email: values.email.trim() }, token);`;
- remova o `<Field label="Senha inicial" ... />` inteiro;
- troque o texto do `<Text style={styles.hint}>` por:

```tsx
      <Text style={styles.hint}>
        O professor entra com a senha padrão da escola e cria a própria senha no primeiro acesso.
      </Text>
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test && npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/api src/app/admin/novo.tsx
git commit -m "feat: cadastro de professor sem senha

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Etapa "Crie sua senha" no login

**Files:**
- Modify: `src/auth/AuthContext.tsx`, `src/app/login.tsx`
- Create: `src/components/FirstAccessForm.tsx`

**Interfaces:**
- Consumes: `firstAccess`, `isFirstAccessRequired`, `FirstAccessInput` e as regras de `src/lib/firstAccess.ts` (Task 1).
- Produces:
  - `AuthValue.completeFirstAccess(input: FirstAccessInput): Promise<SessionUser>`
  - `FirstAccessForm({ email: string; currentPassword: string; onDone: (user: SessionUser) => void; onRestart: (message: string) => void; onBack: () => void })`

Sem teste unitário (só UI e fiação; as regras estão na Task 1). A verificação é por typecheck, lint, export e o roteiro manual da Task 4.

- [ ] **Step 1: `AuthContext`**

Em `src/auth/AuthContext.tsx`:
- troque `import { login } from '@/api/auth';` por `import { firstAccess, login } from '@/api/auth';`;
- troque `import type { SessionUser } from '@/api/types';` por `import type { FirstAccessInput, LoginResponse, SessionUser } from '@/api/types';`;
- em `AuthValue`, depois de `signIn(...)`, acrescente `completeFirstAccess(input: FirstAccessInput): Promise<SessionUser>;`;
- troque o `signIn` por:

```tsx
  const saveSession = useCallback(async (res: LoginResponse) => {
    const next: Session = { token: res.token, expiresAt: res.expiresAt, user: res.user };
    setSession(next);
    await saveRaw(JSON.stringify(next)).catch(() => {});
    return res.user;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => saveSession(await login(email, password)),
    [saveSession],
  );

  const completeFirstAccess = useCallback(
    async (input: FirstAccessInput) => saveSession(await firstAccess(input)),
    [saveSession],
  );
```

- no `useMemo`, acrescente `completeFirstAccess` depois de `signIn,` no objeto e troque as dependências por `[ready, session, signIn, completeFirstAccess, signOut]`.

- [ ] **Step 2: `FirstAccessForm`**

`src/components/FirstAccessForm.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SessionUser } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { firstAccessFormError, restartsLogin, validateNewPassword } from '@/lib/firstAccess';
import type { FormError } from '@/lib/formError';
import { colors, fonts } from '@/theme';
import { Field } from './Field';
import { IconButton } from './IconButton';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  email: string;
  currentPassword: string;
  onDone: (user: SessionUser) => void;
  onRestart: (message: string) => void;
  onBack: () => void;
};

const NO_ERROR: FormError = { error: null, fieldErrors: {} };

export function FirstAccessForm({ email, currentPassword, onDone, onRestart, onBack }: Props) {
  const { completeFirstAccess } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError>(NO_ERROR);

  async function submit() {
    if (saving) return;
    const fieldErrors = validateNewPassword(password, confirm);
    if (Object.keys(fieldErrors).length > 0) {
      setFormError({ error: null, fieldErrors });
      return;
    }
    setSaving(true);
    setFormError(NO_ERROR);
    try {
      onDone(await completeFirstAccess({ email, currentPassword, password, confirmPassword: confirm }));
    } catch (err) {
      if (restartsLogin(err)) onRestart(err.message);
      else setFormError(firstAccessFormError(err));
    } finally {
      setSaving(false);
    }
  }

  const fe = formError.fieldErrors;
  return (
    <>
      <View style={styles.nav}>
        <IconButton label="‹" onPress={onBack} accessibilityLabel="Voltar" />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Crie sua senha
      </Text>
      <Text style={styles.subtitle}>Primeiro acesso de {email.trim()}. Esta será sua senha no app e no site.</Text>
      {formError.error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {formError.error}
        </Text>
      ) : null}
      <Field
        label="Nova senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        error={fe.password?.[0]}
      />
      <Field
        label="Repetir senha"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
        error={fe.confirmPassword?.[0]}
      />
      <Text style={styles.hint}>Mínimo de 8 caracteres.</Text>
      <PrimaryButton label="Salvar e entrar" onPress={submit} loading={saving} />
    </>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', marginBottom: 18 },
  title: { fontFamily: fonts.display800, fontSize: 30, lineHeight: 32, color: colors.text, marginBottom: 6 },
  subtitle: { fontFamily: fonts.body400, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginBottom: 26 },
  error: { fontFamily: fonts.body500, fontSize: 13, color: colors.danger, marginBottom: 14 },
  hint: { fontFamily: fonts.body400, fontSize: 12, color: colors.textFaint, marginTop: -6, marginBottom: 20 },
});
```

- [ ] **Step 3: Login alterna as etapas**

Em `src/app/login.tsx`:
- troque `import { useAuth } from '@/auth/AuthContext';` por:

```tsx
import { isFirstAccessRequired } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';
```

  e deixe esse import de `@/api/auth` antes do de `@/api/client`;
- acrescente `import { FirstAccessForm } from '@/components/FirstAccessForm';` antes do import de `IconButton`;
- depois de `const [fieldErrors, setFieldErrors] = ...`, acrescente:

```tsx
  // true depois que a API pede a senha nova; e-mail e senha padrão ficam só neste estado.
  const [firstAccess, setFirstAccess] = useState(false);

  function restartLogin(message: string) {
    setFirstAccess(false);
    setPassword('');
    setFieldErrors({});
    setError(message);
  }
```

- no `catch` de `submit`, antes de `if (err instanceof ApiError) {`, acrescente:

```tsx
      if (isFirstAccessRequired(err)) {
        setFirstAccess(true);
        return;
      }
```

- dentro do `<ScrollView>`, envolva todo o conteúdo atual em um fragmento e mostre a etapa no lugar dele:

```tsx
          {firstAccess ? (
            <FirstAccessForm
              email={email}
              currentPassword={password}
              onDone={setSignedIn}
              onRestart={restartLogin}
              onBack={() => setFirstAccess(false)}
            />
          ) : (
            <>
              {/* conteúdo atual: nav com ✕, título, subtítulo, erro, campos, botão e dica */}
            </>
          )}
```

O comentário acima só marca o lugar: mova o JSX existente para dentro do fragmento, sem alterá-lo, e não deixe o comentário no código.

- [ ] **Step 4: Verificar tudo e o bundle**

Run: `npm test && npx tsc --noEmit && npx expo lint && npx expo export --platform android --output-dir "$TEMP/tc4-export"`
Expected: tudo passa; export "Exported".

- [ ] **Step 5: Commit**

```bash
git add src/auth/AuthContext.tsx src/app/login.tsx src/components/FirstAccessForm.tsx
git commit -m "feat: etapa de nova senha no primeiro acesso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: README e teste do fluxo

**Files:**
- Modify: `README.md` (seção "Área de administração")

- [ ] **Step 1: Atualizar a seção**

Depois da linha `- Remover um professor apaga também a conta de login dele.`, acrescente:

```markdown
- Professor novo entra com a senha padrão da escola (`DEFAULT_TEACHER_PASSWORD` na API) e cria a própria senha no primeiro acesso, pelo app.
```

No parágrafo "Depende dos ajustes da API…", troque `e \`PATCH /api/author/:id/status\` para desativar e reativar.` por:

```markdown
`PATCH /api/author/:id/status` para desativar e reativar, `POST /api/author` só com nome e e-mail, `FIRST_ACCESS_REQUIRED` no login e `POST /api/auth/first-access`.
```

- [ ] **Step 2: Checagem e commit**

Run: `npm test && npx tsc --noEmit && npx expo lint`
Expected: PASS.

Inclua no commit só as linhas desta task, sem as alterações locais do usuário no README.

```bash
git commit -m "docs: primeiro acesso no README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Roteiro manual (Expo Go, com a API rodando)**

1. Cadastre um professor no Painel: o formulário só pede nome e e-mail.
2. Entre com o e-mail dele e a senha padrão: abre "Crie sua senha".
3. Teste senha curta e senhas diferentes: mensagens embaixo dos campos, sem chamar a API.
4. Teste a nova senha igual à padrão: mensagem da API embaixo de "Nova senha".
5. Toque em "‹", troque o e-mail para outra conta em primeiro acesso, entre de novo: o texto mostra o novo e-mail.
6. Salve uma senha válida, com toque duplo em "Salvar e entrar": entra logado e volta para a lista.
7. Saia e entre com a senha nova: funciona. Com a senha padrão: "E-mail ou senha inválidos."
8. Feche e reabra o app: a sessão continua.
9. Desative um professor em primeiro acesso e tente entrar: "Conta desativada…".
