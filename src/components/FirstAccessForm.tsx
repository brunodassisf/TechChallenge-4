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
