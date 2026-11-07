import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { createAuthor } from '@/api/authors';
import type { AuthorInput } from '@/api/types';
import { Field } from '@/components/Field';
import { ModalForm } from '@/components/ModalForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { toFormError, type FormError } from '@/lib/formError';
import { colors, fonts } from '@/theme';

const NO_ERROR: FormError = { error: null, fieldErrors: {} };

export default function NewAuthor() {
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const [values, setValues] = useState<AuthorInput>({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError>(NO_ERROR);

  async function submit() {
    const token = requireToken();
    if (!token) return;
    setSaving(true);
    setFormError(NO_ERROR);
    try {
      await createAuthor({ name: values.name.trim(), email: values.email.trim() }, token);
      router.dismissTo({ pathname: '/admin', params: { aviso: 'Professor cadastrado' } });
    } catch (err) {
      if (!handleApiError(err)) setFormError(toFormError(err));
    } finally {
      setSaving(false);
    }
  }

  const fe = formError.fieldErrors;
  return (
    <ModalForm title="Novo professor" error={formError.error} onClose={() => router.back()}>
      <Field
        label="Nome"
        value={values.name}
        onChangeText={(t) => setValues((v) => ({ ...v, name: t }))}
        autoCapitalize="words"
        textContentType="name"
        error={fe.name?.[0]}
      />
      <Field
        label="E-mail"
        value={values.email}
        onChangeText={(t) => setValues((v) => ({ ...v, email: t }))}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        error={fe.email?.[0]}
      />
      <Text style={styles.hint}>
        O professor entra com a senha padrão da escola e cria a própria senha no primeiro acesso.
      </Text>
      <PrimaryButton label="Cadastrar" onPress={submit} loading={saving} tone="admin" />
    </ModalForm>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body400, fontSize: 12, lineHeight: 17, color: colors.textFaint, marginTop: -6, marginBottom: 20 },
});
