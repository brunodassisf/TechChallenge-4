import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Props = TextInputProps & { label: string; error?: string };

export function Field({ label, error, style, ...input }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        {...input}
        accessibilityLabel={label}
        style={[styles.input, input.multiline && styles.multiline, !!error && styles.inputError, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontFamily: fonts.body700, fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: colors.field,
    borderWidth: 1.5,
    borderColor: colors.fieldBorder,
    borderRadius: radius.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body400,
    fontSize: 14,
    color: colors.text,
  },
  multiline: { minHeight: 180, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  error: { fontFamily: fonts.body400, fontSize: 12, color: colors.danger, marginTop: 4 },
});
