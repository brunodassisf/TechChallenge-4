# Cadastro de estudante: plano de implementação

> **Para agentes:** sub-skill obrigatória: superpowers:executing-plans (ou superpowers:subagent-driven-development). Os passos usam checkbox (`- [ ]`) para acompanhar o progresso.

**Objetivo:** o estudante cria a própria conta pela tela Entrar e já sai logado.

**Arquitetura:**
- A camada de API ganha `signUp()`, que chama `POST /api/student`, e o `AuthContext` grava a sessão pelo mesmo `saveSession` do login.
- As regras puras ficam em `src/lib`:
  - `validateSignUp` faz a validação no aparelho;
  - `stepFormError` é a regra que manda para o topo o erro de campo que a etapa não mostra, agora generalizada para qualquer etapa.
- A tela `/login` passa a ter três etapas (`login`, `firstAccess` e `signUp`), e a etapa nova é o componente `SignUpForm`.

**Tecnologias:** Expo SDK 57, React Native 0.86, Expo Router, TypeScript, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-11-13-cadastro-estudante-design.md`

## Restrições globais

- Endpoint: `POST /api/student`, com body `{ name, email, password, confirmPassword }`.
  - 201 no formato do login (`LoginResponse`);
  - 400 `{ errors }`;
  - 409 `{ error }`.
- Textos exatos:
  - "Não tem conta? Cadastre-se"
  - "Criar conta"
  - "Para estudantes. Professores recebem o acesso da coordenação."
  - "Nome", "E-mail", "Senha", "Repetir senha"
  - "Mínimo de 8 caracteres."
  - "Informe o nome."
- As regras de senha são as de `validateNewPassword`, que já existe.
- Não há confirmação de e-mail. Ela fica para outra spec.
- Antes de cada commit: `npm test`, `npx tsc --noEmit` e `npx expo lint`.
- Um commit por tarefa no master, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Pontos para revisar

1. **Toque duplo em "Criar conta"** criaria duas requisições, e a segunda voltaria com 409. Proteção: `if (saving) return`.
2. **Nome e e-mail com espaços nas pontas** vão sem esses espaços (teste de `signUp`).
3. **409 ou falta de conexão** não podem apagar o que o estudante digitou. Os campos ficam no estado do `SignUpForm` e só o erro muda.
4. **Erro da API num campo que não está na tela** sobe para o topo (teste de `stepFormError`).
5. **Erro antigo do login** não aparece na etapa de cadastro, e o erro do cadastro não aparece no login. Cada etapa tem o próprio erro; ao abrir o cadastro, `login.tsx` limpa `error`.

---

### Tarefa 1: `signUp` na API e no contexto

**Arquivos:**
- Alterar: `src/api/types.ts`
- Alterar: `src/api/auth.ts`
- Alterar: `src/auth/AuthContext.tsx`
- Testar: `src/api/auth.test.ts`

**Interfaces:**
- Produz:
  - `type SignUpInput = { name: string; email: string; password: string; confirmPassword: string }`;
  - `signUp(input: SignUpInput): Promise<LoginResponse>`;
  - `useAuth().signUp(input: SignUpInput): Promise<SessionUser>`.

- [ ] **Passo 1: teste que falha.** Em `src/api/auth.test.ts`, troque o import por `import { firstAccess, isFirstAccessRequired, signUp } from './auth';` e acrescente no fim:

```ts
describe('signUp', () => {
  it('envia POST /api/student com nome e e-mail sem espaços nas pontas', async () => {
    const session = { message: 'ok', token: 't', tokenType: 'Bearer', expiresAt: '2026-12-01', user: { id: 'u1' } };
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => session } as Response);
    const res = await signUp({
      name: '  Ana Souza ',
      email: ' ana@x.com ',
      password: 'minhasenha',
      confirmPassword: 'minhasenha',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Ana Souza',
      email: 'ana@x.com',
      password: 'minhasenha',
      confirmPassword: 'minhasenha',
    });
    expect(res).toEqual(session);
  });
});
```

- [ ] **Passo 2:** `npx jest src/api/auth.test.ts`. Esperado: FAIL (`signUp` não existe).

- [ ] **Passo 3: implementação.** Em `src/api/types.ts`, depois de `FirstAccessInput`:

```ts
export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};
```

Em `src/api/auth.ts`, troque o import de tipos para `import type { FirstAccessInput, LoginResponse, SignUpInput } from './types';` e acrescente:

```ts
/** Cadastro de estudante: a resposta é a mesma do login (201). */
export function signUp(input: SignUpInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/student', {
    method: 'POST',
    body: { ...input, name: input.name.trim(), email: input.email.trim() },
  });
}
```

Em `src/auth/AuthContext.tsx`:
- imports: `import { firstAccess, login, signUp as signUpRequest } from '@/api/auth';` e `SignUpInput` no import de tipos;
- em `AuthValue`: `signUp(input: SignUpInput): Promise<SessionUser>;`;
- depois de `completeFirstAccess`:

```ts
  const signUp = useCallback(
    async (input: SignUpInput) => saveSession(await signUpRequest(input)),
    [saveSession],
  );
```

- e no `useMemo`, `signUp` no objeto e nas dependências.

- [ ] **Passo 4:** `npx jest src/api/auth.test.ts` deve dar PASS, e `npx tsc --noEmit` deve dar 0.
- [ ] **Passo 5: commit** `feat: signUp na API e no contexto de auth`.

### Tarefa 2: regras puras (`validateSignUp` e `stepFormError`)

**Arquivos:**
- Alterar: `src/lib/formError.ts`
- Alterar: `src/lib/firstAccess.ts`
- Criar: `src/lib/signUp.ts`
- Testar: `src/lib/formError.test.ts` (criar) e `src/lib/signUp.test.ts` (criar)

**Interfaces:**
- Consome: `validateNewPassword(password, confirm)` de `firstAccess.ts` e `toFormError(err)`.
- Produz:
  - `stepFormError(err: unknown, stepFields: readonly string[]): FormError`;
  - `validateSignUp(input: SignUpInput): Record<string, string[]>`;
  - `signUpFormError(err: unknown): FormError`.

- [ ] **Passo 1: testes que falham.** Crie `src/lib/formError.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { stepFormError } from './formError';

const FIELDS = ['name', 'password'] as const;

describe('stepFormError', () => {
  it('erro em campo da etapa fica no campo', () => {
    const err = new ApiError(400, 'Confira', { name: ['Informe o nome.'] });
    expect(stepFormError(err, FIELDS)).toEqual({ error: null, fieldErrors: { name: ['Informe o nome.'] } });
  });
  it('erro só em campo fora da etapa vai para o topo', () => {
    const err = new ApiError(400, 'Confira', { role: ['Inválido.'] });
    expect(stepFormError(err, FIELDS)).toEqual({ error: 'Inválido.', fieldErrors: {} });
  });
  it('409 vai para o topo', () => {
    const err = new ApiError(409, 'Já existe uma conta com esse e-mail.');
    expect(stepFormError(err, FIELDS)).toEqual({ error: 'Já existe uma conta com esse e-mail.', fieldErrors: {} });
  });
  it('erro que não é da API vira mensagem genérica no topo', () => {
    expect(stepFormError(new Error('x'), FIELDS)).toEqual({ error: 'Algo deu errado. Tente de novo.', fieldErrors: {} });
  });
});
```

Crie `src/lib/signUp.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { signUpFormError, validateSignUp } from './signUp';

const valid = { name: 'Ana', email: 'ana@x.com', password: 'minhasenha', confirmPassword: 'minhasenha' };

describe('validateSignUp', () => {
  it('campos válidos não têm erro', () => {
    expect(validateSignUp(valid)).toEqual({});
  });
  it('nome vazio', () => {
    expect(validateSignUp({ ...valid, name: '' })).toEqual({ name: ['Informe o nome.'] });
  });
  it('nome só com espaços', () => {
    expect(validateSignUp({ ...valid, name: '   ' })).toEqual({ name: ['Informe o nome.'] });
  });
  it('senha curta', () => {
    expect(validateSignUp({ ...valid, password: '1234567', confirmPassword: '1234567' })).toEqual({
      password: ['A senha deve ter pelo menos 8 caracteres.'],
    });
  });
  it('senhas diferentes', () => {
    expect(validateSignUp({ ...valid, confirmPassword: 'outrasenha' })).toEqual({
      confirmPassword: ['As senhas não coincidem.'],
    });
  });
  it('junta erro de nome e de senha', () => {
    expect(validateSignUp({ ...valid, name: '', password: 'curta', confirmPassword: 'curta' })).toEqual({
      name: ['Informe o nome.'],
      password: ['A senha deve ter pelo menos 8 caracteres.'],
    });
  });
});

describe('signUpFormError', () => {
  it('e-mail é campo da etapa', () => {
    const err = new ApiError(400, 'Confira', { email: ['Informe um e-mail válido.'] });
    expect(signUpFormError(err)).toEqual({ error: null, fieldErrors: { email: ['Informe um e-mail válido.'] } });
  });
});
```

- [ ] **Passo 2:** `npx jest src/lib`. Esperado: FAIL (`stepFormError` e `./signUp` não existem).

- [ ] **Passo 3: implementação.** Em `src/lib/formError.ts`, acrescente:

```ts
/** Erro em campo que a etapa não mostra sobe para o topo, para não sumir. */
export function stepFormError(err: unknown, stepFields: readonly string[]): FormError {
  const form = toFormError(err);
  const entries = Object.entries(form.fieldErrors);
  if (entries.length === 0 || entries.some(([field]) => stepFields.includes(field))) return form;
  return { error: entries[0][1][0] ?? null, fieldErrors: {} };
}
```

Em `src/lib/firstAccess.ts`:
- troque o import por `import { stepFormError, type FormError } from './formError';`;
- substitua o corpo de `firstAccessFormError` por `return stepFormError(err, STEP_FIELDS);`, mantendo o comentário de doc;
- deixe `STEP_FIELDS` como `const STEP_FIELDS = ['password', 'confirmPassword'] as const;`.

Crie `src/lib/signUp.ts`:

```ts
import type { SignUpInput } from '@/api/types';
import { validateNewPassword } from './firstAccess';
import { stepFormError, type FormError } from './formError';

const STEP_FIELDS = ['name', 'email', 'password', 'confirmPassword'] as const;

/** Mesmas regras da API; o formato do e-mail fica com ela. */
export function validateSignUp(input: SignUpInput): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!input.name.trim()) errors.name = ['Informe o nome.'];
  return { ...errors, ...validateNewPassword(input.password, input.confirmPassword) };
}

export function signUpFormError(err: unknown): FormError {
  return stepFormError(err, STEP_FIELDS);
}
```

- [ ] **Passo 4:** `npm test` deve dar PASS, incluindo os testes atuais de `firstAccessFormError`, e `npx tsc --noEmit` deve dar 0.
- [ ] **Passo 5: commit** `feat: regras do cadastro de estudante`.

### Tarefa 3: etapa "Criar conta" no `/login`

**Arquivos:**
- Criar: `src/components/SignUpForm.tsx`
- Alterar: `src/app/login.tsx`

**Interfaces:**
- Consome: `useAuth().signUp`, `validateSignUp` e `signUpFormError`.
- Produz: `SignUpForm({ onDone(user: SessionUser), onBack() })`.

- [ ] **Passo 1:** crie `src/components/SignUpForm.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SessionUser } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import type { FormError } from '@/lib/formError';
import { signUpFormError, validateSignUp } from '@/lib/signUp';
import { colors, fonts } from '@/theme';
import { Field } from './Field';
import { IconButton } from './IconButton';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  onDone: (user: SessionUser) => void;
  onBack: () => void;
};

const NO_ERROR: FormError = { error: null, fieldErrors: {} };

export function SignUpForm({ onDone, onBack }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError>(NO_ERROR);

  async function submit() {
    if (saving) return;
    const input = { name, email, password, confirmPassword: confirm };
    const fieldErrors = validateSignUp(input);
    if (Object.keys(fieldErrors).length > 0) {
      setFormError({ error: null, fieldErrors });
      return;
    }
    setSaving(true);
    setFormError(NO_ERROR);
    try {
      onDone(await signUp(input));
    } catch (err) {
      setFormError(signUpFormError(err));
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
        Criar conta
      </Text>
      <Text style={styles.subtitle}>Para estudantes. Professores recebem o acesso da coordenação.</Text>
      {formError.error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {formError.error}
        </Text>
      ) : null}
      <Field
        label="Nome"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        error={fe.name?.[0]}
      />
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        error={fe.email?.[0]}
      />
      <Field
        label="Senha"
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
      <PrimaryButton label="Criar conta" onPress={submit} loading={saving} />
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

- [ ] **Passo 2:** em `src/app/login.tsx`:
- importe `Pressable` de `react-native` e `SignUpForm` de `@/components/SignUpForm`;
- troque `const [firstAccess, setFirstAccess] = useState(false);` por:

```tsx
  // 'firstAccess' depois que a API pede a senha nova; e-mail e senha padrão ficam só neste estado.
  const [step, setStep] = useState<'login' | 'firstAccess' | 'signUp'>('login');
```

- `restartLogin`: troque `setFirstAccess(false)` por `setStep('login')`;
- `submit`: troque `setFirstAccess(true)` por `setStep('firstAccess')`;
- acrescente:

```tsx
  function openSignUp() {
    setError(null);
    setFieldErrors({});
    setStep('signUp');
  }
```

- no JSX, troque o ternário `firstAccess ? <FirstAccessForm …/> : (<>…</>)` por:

```tsx
          {step === 'firstAccess' ? (
            <FirstAccessForm
              email={email}
              currentPassword={password}
              onDone={setSignedIn}
              onRestart={restartLogin}
              onBack={() => setStep('login')}
            />
          ) : step === 'signUp' ? (
            <SignUpForm onDone={setSignedIn} onBack={() => setStep('login')} />
          ) : (
            <>
              {/* conteúdo atual do login, sem mudanças, até o hint */}
            </>
          )}
```

Mantenha o bloco do login como está. Logo depois do `<Text style={styles.hint}>…</Text>`, acrescente:

```tsx
              <Pressable onPress={openSignUp} accessibilityRole="link" hitSlop={8} style={styles.signUp}>
                <Text style={styles.signUpText}>
                  Não tem conta? <Text style={styles.accent}>Cadastre-se</Text>
                </Text>
              </Pressable>
```

- nos estilos:

```tsx
  signUp: { alignSelf: 'center', marginTop: 22 },
  signUpText: { fontFamily: fonts.body500, fontSize: 13, color: colors.textMuted },
```

- [ ] **Passo 3:** `npx tsc --noEmit` deve dar 0, `npx expo lint` não deve ter erros e `npm test` deve dar PASS. Rode também `npx expo export --platform android --output-dir "$TEMP/tc4-export"`, que deve fechar o bundle sem erro.
- [ ] **Passo 4: verificação manual, com a API no ar.**
  1. Na tela Entrar, toque em "Cadastre-se".
  2. Toque em "Criar conta" com os campos vazios. Deve aparecer erro em Nome e em Senha.
  3. Preencha tudo e envie. O app deve voltar à lista de posts já logado como estudante, e o botão de criar post não deve aparecer.
  4. Repita com o mesmo e-mail. A mensagem 409 deve aparecer no topo, com os campos ainda preenchidos.
- [ ] **Passo 5: commit** `feat: etapa Criar conta na tela de login`.

### Tarefa 4: README

**Arquivos:**
- Alterar: `README.md`

- [ ] **Passo 1:** na tabela de telas, troque a linha de `/login` por:

```
| `/login` | Login com a mesma conta do site do Tech Challenge 3; cadastro de estudante ("Cadastre-se") |
```

- [ ] **Passo 2:** depois da tabela de telas, acrescente a seção:

```markdown
## Cadastro de estudante

Na tela Entrar, "Não tem conta? Cadastre-se" abre a etapa **Criar conta** (nome, e-mail, senha e repetir senha). O estudante escolhe a própria senha, sem senha padrão e sem primeiro acesso, e já sai logado. Estudante só lê posts. Não há confirmação de e-mail.

Depende de `POST /api/student` na API do Tech Challenge 3.
```

- [ ] **Passo 3:** `git diff README.md` para conferir. Commit `docs: cadastro de estudante no README`.
