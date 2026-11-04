import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { renameAuthor } from '@/api/authors';
import { ApiError } from '@/api/client';
import { Field } from '@/components/Field';
import { ModalForm } from '@/components/ModalForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { toFormError, type FormError } from '@/lib/formError';
import { colors, fonts } from '@/theme';

const NO_ERROR: FormError = { error: null, fieldErrors: {} };

export default function RenameAuthor() {
  const { id, name: current } = useLocalSearchParams<{ id: string; name?: string }>();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const [name, setName] = useState(current ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<FormError>(NO_ERROR);

  async function submit() {
    const token = requireToken();
    if (!token) return;
    setSaving(true);
    setFormError(NO_ERROR);
    try {
      await renameAuthor(id, name.trim(), token);
      router.dismissTo({ pathname: '/admin', params: { aviso: 'Nome atualizado' } });
    } catch (err) {
      if (handleApiError(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Professor não encontrado', 'Ele pode ter sido removido.');
        router.dismissTo('/admin');
        return;
      }
      setFormError(toFormError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalForm title="Renomear" error={formError.error} onClose={() => router.back()}>
      <Field
        label="Nome"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoFocus
        onSubmitEditing={submit}
        error={formError.fieldErrors.name?.[0]}
      />
      <Text style={styles.hint}>O novo nome aparece em todos os posts dessa pessoa.</Text>
      <PrimaryButton label="Salvar" onPress={submit} loading={saving} tone="admin" />
    </ModalForm>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body400, fontSize: 12, lineHeight: 17, color: colors.textFaint, marginTop: -6, marginBottom: 20 },
});
