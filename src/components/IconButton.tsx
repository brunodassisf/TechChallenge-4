import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Props = { label: string; onPress: () => void; accessibilityLabel: string; tone?: 'default' | 'danger' };

export function IconButton({ label, onPress, accessibilityLabel, tone = 'default' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.btn, tone === 'danger' && styles.danger]}
    >
      <Text style={[styles.text, tone === 'danger' && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 40,
    height: 40,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    backgroundColor: colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: { backgroundColor: 'rgba(255,138,122,0.2)' },
  text: { fontFamily: fonts.display700, fontSize: 14, color: colors.text },
});
