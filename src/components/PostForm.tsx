import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import type { PostInput } from '@/api/types';
import { colors, fonts, space } from '@/theme';
import { CategoryChips } from './CategoryChips';
import { Field } from './Field';
import { IconButton } from './IconButton';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  title: string;
  submitLabel: string;
  initial: PostInput;
  onSubmit: (input: PostInput) => Promise<void>;
  onClose: () => void;
};

export function PostForm({ title, submitLabel, initial, onSubmit, onClose }: Props) {
  const [values, setValues] = useState<PostInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function submit() {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit({ ...values, title: values.title.trim(), text: values.text.trim() });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors ?? {});
        if (!err.fieldErrors) setError(err.message);
      } else {
        setError('Algo deu errado. Tente de novo.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.nav}>
            <IconButton label="✕" onPress={onClose} accessibilityLabel="Fechar" />
            <Text style={styles.navTitle} accessibilityRole="header">
              {title}
            </Text>
            <View style={styles.navSpacer} />
          </View>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Field
            label="Título"
            value={values.title}
            onChangeText={(t) => setValues((v) => ({ ...v, title: t }))}
            error={fieldErrors.title?.[0]}
            maxLength={140}
          />
          <Text style={styles.label}>Matéria</Text>
          <CategoryChips value={values.category} onChange={(c) => setValues((v) => ({ ...v, category: c }))} />
          {fieldErrors.category?.[0] ? <Text style={styles.error}>{fieldErrors.category[0]}</Text> : null}
          <Field
            label="Conteúdo"
            value={values.text}
            onChangeText={(t) => setValues((v) => ({ ...v, text: t }))}
            multiline
            error={fieldErrors.text?.[0]}
          />
          <PrimaryButton label={submitLabel} onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: 40 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  navTitle: { fontFamily: fonts.display700, fontSize: 16, color: colors.text },
  navSpacer: { width: 40 },
  label: { fontFamily: fonts.body700, fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  error: { fontFamily: fonts.body500, fontSize: 13, color: colors.danger, marginBottom: 12 },
});
