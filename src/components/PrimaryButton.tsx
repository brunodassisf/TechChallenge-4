import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '@/theme';

const TONES = { accent: colors.accent, danger: colors.danger, admin: colors.admin } as const;

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'accent' | 'danger' | 'admin';
};

export function PrimaryButton({ label, onPress, loading, disabled, tone = 'accent' }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: TONES[tone] },
        (pressed || off) && { opacity: 0.7 },
      ]}
    >
      {loading ? <ActivityIndicator color={colors.onCard} /> : <Text style={styles.text}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  text: { fontFamily: fonts.display800, fontSize: 16, color: colors.onCard },
});
