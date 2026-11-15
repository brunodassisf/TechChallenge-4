# "Meus dados" do estudante: plano de implementação

> **Para agentes:** sub-skill obrigatória: superpowers:executing-plans (ou superpowers:subagent-driven-development). Os passos usam checkbox (`- [ ]`) para acompanhar o progresso.

**Objetivo:** o estudante logado edita o próprio nome e e-mail e pode trocar a senha, na tela `/perfil`.

**Arquitetura:**
- `src/api/students.ts` chama `GET` e `PUT /api/student/me` com o token.
- As regras puras ficam em `src/lib/profile.ts`: quando pedir a senha atual, a validação e o roteamento dos erros.
- O `AuthContext` ganha `updateUser`, para que o nome novo apareça no avatar.
- A tela `/perfil` é um modal com `ModalForm`, protegida por `Stack.Protected guard={isStudent(user)}`. A entrada é o menu do avatar na lista de posts.

**Tecnologias:** Expo SDK 57, React Native 0.86, Expo Router (typed routes), TypeScript, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-11-14-meus-dados-estudante-design.md`

## Restrições globais

- Endpoints, sempre com `Authorization: Bearer`:
  - `GET /api/student/me` → `{ name, email }`;
  - `PUT /api/student/me`, com body `{ name, email, currentPassword?, password?, confirmPassword? }` → 200 `{ user }`, 400 `{ errors }` ou 409 `{ error }`.
- Senha atual errada é **400 em `currentPassword`**, nunca 401, porque o app trata 401 como sessão vencida.
- Textos exatos:
  - "Meus dados", "Nome", "E-mail", "Trocar senha (opcional)", "Nova senha", "Repetir nova senha", "Senha atual", "Salvar"
  - "Mínimo de 8 caracteres. Deixe em branco para manter a atual."
  - "Informe o nome."
  - "Informe a senha atual."
  - "Dados atualizados"
- As regras de senha são as de `validateNewPassword`, que já existe.
- Antes de cada commit: `npm test`, `npx tsc --noEmit` e `npx expo lint`.
- Um commit por tarefa no master, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Pontos para revisar

1. **Erro de "senha atual" que fica para trás:** se o estudante muda o e-mail, digita a senha atual e depois volta o e-mail ao original, o campo some e a senha não pode ir para a API. A tela envia `currentPassword: ''` quando `needsCurrentPassword` é falso.
2. **Só "Repetir nova senha" preenchido** também conta como querer trocar a senha: vale a validação e é pedida a senha atual (teste em `profile.test.ts`).
3. **E-mail com espaços nas pontas** não conta como troca de e-mail (teste de `needsCurrentPassword`).
4. **Toque duplo em "Salvar":** a tela tem `if (saving) return`.
5. **Um novo GET depois de `updateUser`:** a sessão muda, e com ela o `requireToken`. Um ref impede que a carga rode de novo e reescreva o formulário.

---

### Tarefa 1: API de perfil e `updateUser`

**Arquivos:**
- Alterar: `src/api/types.ts`
- Criar: `src/api/students.ts`
- Testar: `src/api/students.test.ts` (criar)
- Alterar: `src/auth/AuthContext.tsx`

**Interfaces:**
- Produz:
  - `type StudentProfile = { name: string; email: string }`;
  - `type StudentProfileInput = { name: string; email: string; currentPassword: string; password: string; confirmPassword: string }`;
  - `getMyProfile(token: string): Promise<StudentProfile>`;
  - `updateMyProfile(input: StudentProfileInput, token: string): Promise<SessionUser>`;
  - `useAuth().updateUser(user: SessionUser): Promise<void>`.

- [ ] **Passo 1: teste que falha.** Crie `src/api/students.test.ts`:

```ts
import { getMyProfile, updateMyProfile } from './students';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
});

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue({ ok: status < 300, status, json: async () => body } as Response);
}

const user = { id: 'u1', name: 'Ana', role: 'STUDENT', authorId: null };
const base = { name: 'Ana', email: 'ana@x.com', currentPassword: '', password: '', confirmPassword: '' };

describe('getMyProfile', () => {
  it('GET /api/student/me com o token', async () => {
    respond(200, { name: 'Ana', email: 'ana@x.com' });
    await expect(getMyProfile('tk')).resolves.toEqual({ name: 'Ana', email: 'ana@x.com' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/me');
    expect(init).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer tk' } });
  });
});

describe('updateMyProfile', () => {
  it('PUT com nome e e-mail sem espaços nas pontas e sem campos de senha vazios', async () => {
    respond(200, { user });
    const res = await updateMyProfile({ ...base, name: ' Ana Souza ', email: ' ana@x.com ' }, 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/me');
    expect(init).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer tk' } });
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana Souza', email: 'ana@x.com' });
    expect(res).toEqual(user);
  });
  it('envia os campos de senha preenchidos', async () => {
    respond(200, { user });
    await updateMyProfile(
      { ...base, currentPassword: 'atual123', password: 'novasenha', confirmPassword: 'novasenha' },
      'tk',
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'Ana',
      email: 'ana@x.com',
      currentPassword: 'atual123',
      password: 'novasenha',
      confirmPassword: 'novasenha',
    });
  });
});
```

- [ ] **Passo 2:** `npx jest src/api/students.test.ts`. Esperado: FAIL (`./students` não existe).

- [ ] **Passo 3: implementação.** Em `src/api/types.ts`, depois de `SignUpInput`:

```ts
export type StudentProfile = { name: string; email: string };

/** Senhas vazias = não trocar a senha / não enviar. */
export type StudentProfileInput = {
  name: string;
  email: string;
  currentPassword: string;
  password: string;
  confirmPassword: string;
};
```

Crie `src/api/students.ts`:

```ts
import { apiRequest } from './client';
import type { SessionUser, StudentProfile, StudentProfileInput } from './types';

const ME = '/api/student/me';

export function getMyProfile(token: string): Promise<StudentProfile> {
  return apiRequest<StudentProfile>(ME, { token });
}

export async function updateMyProfile(input: StudentProfileInput, token: string): Promise<SessionUser> {
  const body: Record<string, string> = { name: input.name.trim(), email: input.email.trim() };
  for (const key of ['currentPassword', 'password', 'confirmPassword'] as const) {
    if (input[key] !== '') body[key] = input[key];
  }
  const res = await apiRequest<{ user: SessionUser }>(ME, { method: 'PUT', body, token });
  return res.user;
}
```

Em `src/auth/AuthContext.tsx`:
- em `AuthValue`: `updateUser(user: SessionUser): Promise<void>;`;
- depois de `signUp`:

```ts
  // Dados do perfil mudaram (nome): o token continua o mesmo.
  const updateUser = useCallback(
    async (user: SessionUser) => {
      if (!session) return;
      const next: Session = { ...session, user };
      setSession(next);
      await saveRaw(JSON.stringify(next)).catch(() => {});
    },
    [session],
  );
```

- e no `useMemo`, `updateUser` no objeto e nas dependências.

- [ ] **Passo 4:** `npx jest src/api/students.test.ts` deve dar PASS (3/3), e `npx tsc --noEmit` deve dar 0.
- [ ] **Passo 5: commit** `feat: API de Meus dados e updateUser na sessão`.

### Tarefa 2: regras puras (`profile.ts` e `isStudent`)

**Arquivos:**
- Criar: `src/lib/profile.ts`
- Testar: `src/lib/profile.test.ts` (criar)
- Alterar: `src/lib/admin.ts`
- Alterar: `src/lib/admin.test.ts`

**Interfaces:**
- Consome: `StudentProfileInput` (Tarefa 1), `validateNewPassword` e `stepFormError`.
- Produz:
  - `needsCurrentPassword(originalEmail: string, form: StudentProfileInput): boolean`;
  - `validateProfile(originalEmail: string, form: StudentProfileInput): Record<string, string[]>`;
  - `profileFormError(err: unknown): FormError`;
  - `isStudent(user: SessionUser | null): boolean`.

- [ ] **Passo 1: testes que falham.** Crie `src/lib/profile.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { needsCurrentPassword, profileFormError, validateProfile } from './profile';

const ORIGINAL = 'ana@x.com';
const form = { name: 'Ana', email: 'ana@x.com', currentPassword: '', password: '', confirmPassword: '' };

describe('needsCurrentPassword', () => {
  it('nada mudou', () => {
    expect(needsCurrentPassword(ORIGINAL, form)).toBe(false);
  });
  it('só o nome mudou', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, name: 'Ana Souza' })).toBe(false);
  });
  it('e-mail mudou', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, email: 'ana@y.com' })).toBe(true);
  });
  it('espaços nas pontas do e-mail não contam', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, email: ' ana@x.com ' })).toBe(false);
  });
  it('nova senha preenchida', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, password: 'x' })).toBe(true);
  });
  it('só repetir senha preenchido', () => {
    expect(needsCurrentPassword(ORIGINAL, { ...form, confirmPassword: 'x' })).toBe(true);
  });
});

describe('validateProfile', () => {
  it('troca só do nome não pede senha', () => {
    expect(validateProfile(ORIGINAL, { ...form, name: 'Ana Souza' })).toEqual({});
  });
  it('nome vazio ou só espaços', () => {
    expect(validateProfile(ORIGINAL, { ...form, name: '  ' })).toEqual({ name: ['Informe o nome.'] });
  });
  it('e-mail mudou sem senha atual', () => {
    expect(validateProfile(ORIGINAL, { ...form, email: 'ana@y.com' })).toEqual({
      currentPassword: ['Informe a senha atual.'],
    });
  });
  it('e-mail mudou com senha atual', () => {
    expect(validateProfile(ORIGINAL, { ...form, email: 'ana@y.com', currentPassword: 'atual123' })).toEqual({});
  });
  it('senha nova curta', () => {
    expect(
      validateProfile(ORIGINAL, { ...form, currentPassword: 'a', password: '1234567', confirmPassword: '1234567' }),
    ).toEqual({ password: ['A senha deve ter pelo menos 8 caracteres.'] });
  });
  it('senhas novas diferentes', () => {
    expect(
      validateProfile(ORIGINAL, { ...form, currentPassword: 'a', password: 'novasenha', confirmPassword: 'outra123' }),
    ).toEqual({ confirmPassword: ['As senhas não coincidem.'] });
  });
  it('só repetir senha preenchido valida a senha nova e pede a atual', () => {
    expect(validateProfile(ORIGINAL, { ...form, confirmPassword: 'novasenha' })).toEqual({
      password: ['A senha deve ter pelo menos 8 caracteres.'],
      confirmPassword: ['As senhas não coincidem.'],
      currentPassword: ['Informe a senha atual.'],
    });
  });
});

describe('profileFormError', () => {
  it('senha atual incorreta fica no campo', () => {
    const err = new ApiError(400, 'Confira', { currentPassword: ['Senha atual incorreta.'] });
    expect(profileFormError(err)).toEqual({
      error: null,
      fieldErrors: { currentPassword: ['Senha atual incorreta.'] },
    });
  });
  it('campo que a tela não mostra vai para o topo', () => {
    const err = new ApiError(400, 'Confira', { role: ['Inválido.'] });
    expect(profileFormError(err)).toEqual({ error: 'Inválido.', fieldErrors: {} });
  });
});
```

Em `src/lib/admin.test.ts`, acrescente `isStudent` ao import e, dentro de `describe('papel')`:

```ts
  it('isStudent', () => {
    expect(isStudent(aluno)).toBe(true);
    expect(isStudent(prof)).toBe(false);
    expect(isStudent(admin)).toBe(false);
    expect(isStudent(null)).toBe(false);
  });
```

- [ ] **Passo 2:** `npx jest src/lib/profile.test.ts src/lib/admin.test.ts`. Esperado: FAIL (`./profile` não existe e `isStudent` não é função).

- [ ] **Passo 3: implementação.** Crie `src/lib/profile.ts`:

```ts
import type { StudentProfileInput } from '@/api/types';
import { validateNewPassword } from './firstAccess';
import { stepFormError, type FormError } from './formError';

const STEP_FIELDS = ['name', 'email', 'currentPassword', 'password', 'confirmPassword'] as const;

function wantsNewPassword(form: StudentProfileInput): boolean {
  return form.password !== '' || form.confirmPassword !== '';
}

/** Trocar e-mail ou senha exige a senha atual; trocar só o nome, não. */
export function needsCurrentPassword(originalEmail: string, form: StudentProfileInput): boolean {
  return form.email.trim() !== originalEmail.trim() || wantsNewPassword(form);
}

/** Mesmas regras da API; o formato do e-mail fica com ela. */
export function validateProfile(originalEmail: string, form: StudentProfileInput): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!form.name.trim()) errors.name = ['Informe o nome.'];
  if (wantsNewPassword(form)) Object.assign(errors, validateNewPassword(form.password, form.confirmPassword));
  if (needsCurrentPassword(originalEmail, form) && form.currentPassword === '') {
    errors.currentPassword = ['Informe a senha atual.'];
  }
  return errors;
}

export function profileFormError(err: unknown): FormError {
  return stepFormError(err, STEP_FIELDS);
}
```

Em `src/lib/admin.ts`, depois de `isAdmin`:

```ts
export function isStudent(user: SessionUser | null): boolean {
  return user?.role === 'STUDENT';
}
```

- [ ] **Passo 4:** `npm test` deve dar PASS, e `npx tsc --noEmit` deve dar 0.
- [ ] **Passo 5: commit** `feat: regras de Meus dados`.

### Tarefa 3: tela `/perfil` e entrada no menu

**Arquivos:**
- Criar: `src/app/perfil.tsx`
- Alterar: `src/app/_layout.tsx`
- Alterar: `src/app/index.tsx`

**Interfaces:**
- Consome:
  - `getMyProfile`, `updateMyProfile` e `useAuth().updateUser` (Tarefa 1);
  - `needsCurrentPassword`, `validateProfile`, `profileFormError` e `isStudent` (Tarefa 2);
  - `useRequireToken` e `useHandleApiError` de `@/hooks/useAuthGuard`;
  - `ModalForm`, `Field`, `PrimaryButton` e `StateMessage`.

- [ ] **Passo 1:** crie `src/app/perfil.tsx`:

```tsx
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { getMyProfile, updateMyProfile } from '@/api/students';
import type { StudentProfileInput } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Field } from '@/components/Field';
import { ModalForm } from '@/components/ModalForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StateMessage } from '@/components/StateMessage';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { toFormError, type FormError } from '@/lib/formError';
import { needsCurrentPassword, profileFormError, validateProfile } from '@/lib/profile';
import { colors, fonts } from '@/theme';

const NO_ERROR: FormError = { error: null, fieldErrors: {} };
const EMPTY: StudentProfileInput = { name: '', email: '', currentPassword: '', password: '', confirmPassword: '' };

export default function Perfil() {
  const { updateUser } = useAuth();
  const requireToken = useRequireToken();
  const handleApiError = useHandleApiError();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalEmail, setOriginalEmail] = useState('');
  const [form, setForm] = useState<StudentProfileInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError>(NO_ERROR);

  const load = useCallback(() => {
    const token = requireToken();
    if (!token) return;
    setStatus('loading');
    getMyProfile(token)
      .then((p) => {
        setOriginalEmail(p.email);
        setForm({ ...EMPTY, name: p.name, email: p.email });
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (handleApiError(err)) return;
        setLoadError(toFormError(err).error);
        setStatus('error');
      });
  }, [requireToken, handleApiError]);

  // Uma carga só: depois de updateUser a sessão muda e load ganha nova identidade.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
  }, [load]);

  const set = (key: keyof StudentProfileInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const askCurrent = needsCurrentPassword(originalEmail, form);

  async function submit() {
    if (saving) return;
    const fieldErrors = validateProfile(originalEmail, form);
    if (Object.keys(fieldErrors).length > 0) {
      setFormError({ error: null, fieldErrors });
      return;
    }
    const token = requireToken();
    if (!token) return;
    setSaving(true);
    setFormError(NO_ERROR);
    try {
      // Campo escondido não vai para a API, mesmo que tenha sobrado texto nele.
      const user = await updateMyProfile({ ...form, currentPassword: askCurrent ? form.currentPassword : '' }, token);
      await updateUser(user);
      router.dismissTo({ pathname: '/', params: { aviso: 'Dados atualizados' } });
    } catch (err) {
      if (handleApiError(err)) return;
      const next = profileFormError(err);
      setFormError(next);
      if (next.fieldErrors.currentPassword) setForm((f) => ({ ...f, currentPassword: '' }));
    } finally {
      setSaving(false);
    }
  }

  const fe = formError.fieldErrors;
  return (
    <ModalForm title="Meus dados" error={status === 'success' ? formError.error : null} onClose={() => router.back()}>
      {status === 'loading' ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : status === 'error' ? (
        <StateMessage emoji="⚠️" title="Não deu para carregar seus dados" message={loadError ?? undefined} actionLabel="Tentar de novo" onAction={load} />
      ) : (
        <>
          <Field label="Nome" value={form.name} onChangeText={set('name')} autoCapitalize="words" autoComplete="name" textContentType="name" error={fe.name?.[0]} />
          <Field
            label="E-mail"
            value={form.email}
            onChangeText={set('email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            error={fe.email?.[0]}
          />
          <Text style={styles.section}>Trocar senha (opcional)</Text>
          <Field
            label="Nova senha"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={fe.password?.[0]}
          />
          <Field
            label="Repetir nova senha"
            value={form.confirmPassword}
            onChangeText={set('confirmPassword')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={fe.confirmPassword?.[0]}
          />
          <Text style={styles.hint}>Mínimo de 8 caracteres. Deixe em branco para manter a atual.</Text>
          {askCurrent ? (
            <Field
              label="Senha atual"
              value={form.currentPassword}
              onChangeText={set('currentPassword')}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={submit}
              error={fe.currentPassword?.[0]}
            />
          ) : null}
          <PrimaryButton label="Salvar" onPress={submit} loading={saving} />
        </>
      )}
    </ModalForm>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 40 },
  section: { fontFamily: fonts.display700, fontSize: 14, color: colors.text, marginTop: 10, marginBottom: 12 },
  hint: { fontFamily: fonts.body400, fontSize: 12, lineHeight: 17, color: colors.textFaint, marginTop: -6, marginBottom: 20 },
});
```

- [ ] **Passo 2:** em `src/app/_layout.tsx`:
- importe `isStudent` junto com `isAdmin`, de `@/lib/admin`;
- depois de `<Stack.Screen name="post/[id]/editar" … />`:

```tsx
        <Stack.Protected guard={isStudent(user)}>
          <Stack.Screen name="perfil" options={{ presentation: 'modal' }} />
        </Stack.Protected>
```

- [ ] **Passo 3:** em `src/app/index.tsx`:
- importe `isStudent` junto com `isAdmin`;
- no `Alert.alert` de `onAccountPress`, depois da linha do Painel:

```tsx
      ...(isStudent(user) ? [{ text: 'Meus dados', onPress: () => router.push('/perfil') }] : []),
```

Por causa disso, o estudante fica com três botões (Meus dados, Cancelar e Sair), que é o limite do `Alert` no Android. O admin também fica com três (Painel, Cancelar e Sair).

- [ ] **Passo 4:** `npx tsc --noEmit` deve dar 0. Se o typed routes não conhecer `/perfil`, rode `npx expo export --platform android --output-dir "$TEMP/tc4-export"`, que regenera os tipos, e repita. `npx expo lint` não deve ter erros, `npm test` deve dar PASS e o export Android deve fechar o bundle sem erro.
- [ ] **Passo 5: verificação manual, com a API no ar.**
  1. Logado como estudante, toque no avatar e escolha "Meus dados". Nome e e-mail devem aparecer preenchidos.
  2. Troque só o nome e salve. O app deve voltar para a lista, mostrar o aviso e trocar as iniciais.
  3. Mude o e-mail. Deve aparecer "Senha atual". Salve sem ela: erro no campo.
  4. Salve com a senha atual errada: o erro aparece embaixo do campo e a pessoa continua logada.
- [ ] **Passo 6: commit** `feat: tela Meus dados do estudante`.

### Tarefa 4: README

**Arquivos:**
- Alterar: `README.md`

- [ ] **Passo 1:** na tabela de telas, depois da linha de `/login`:

```
| `/perfil` | Meus dados: nome, e-mail e troca de senha (só estudante) |
```

- [ ] **Passo 2:** no fim da seção "Cadastro de estudante":

```markdown
Logado, o estudante abre **Meus dados** pelo menu do avatar para editar nome e e-mail e trocar a senha. Trocar o e-mail ou a senha pede a senha atual. Depende de `GET` e `PUT /api/student/me`.
```

- [ ] **Passo 3:** `git diff README.md` para conferir. Commit `docs: Meus dados no README`.
