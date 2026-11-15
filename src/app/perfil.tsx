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
        <StateMessage
          emoji="⚠️"
          title="Não deu para carregar seus dados"
          message={loadError ?? undefined}
          actionLabel="Tentar de novo"
          onAction={load}
        />
      ) : (
        <>
          <Field
            label="Nome"
            value={form.name}
            onChangeText={set('name')}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            error={fe.name?.[0]}
          />
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
