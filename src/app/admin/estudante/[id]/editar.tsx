import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { ApiError } from '@/api/client';
import { updateStudent } from '@/api/students';
import type { StudentInput } from '@/api/types';
import { Field } from '@/components/Field';
import { ModalForm } from '@/components/ModalForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { toFormError, type FormError } from '@/lib/formError';
import { colors, fonts } from '@/theme';

const NO_ERROR: FormError = { error: null, fieldErrors: {} };

export default function EditStudent() {
  const params = useLocalSearchParams<{ id: string; name?: string; email?: string }>();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const [values, setValues] = useState<StudentInput>({ name: params.name ?? '', email: params.email ?? '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError>(NO_ERROR);

  async function submit() {
    const token = requireToken();
    if (!token) return;
    setSaving(true);
    setFormError(NO_ERROR);
    try {
      await updateStudent(params.id, values, token);
      router.dismissTo({ pathname: '/admin', params: { aviso: 'Estudante atualizado' } });
    } catch (err) {
      if (handleApiError(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Estudante não encontrado', 'Ele pode ter sido excluído.');
        router.dismissTo('/admin');
        return;
      }
      setFormError(toFormError(err));
    } finally {
      setSaving(false);
    }
  }

  const fe = formError.fieldErrors;
  return (
    <ModalForm title="Editar estudante" error={formError.error} onClose={() => router.back()}>
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
        onSubmitEditing={submit}
        error={fe.email?.[0]}
      />
      <Text style={styles.hint}>A senha do estudante não muda.</Text>
      <PrimaryButton label="Salvar" onPress={submit} loading={saving} tone="admin" />
    </ModalForm>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body400, fontSize: 12, lineHeight: 17, color: colors.textFaint, marginTop: -6, marginBottom: 20 },
});
