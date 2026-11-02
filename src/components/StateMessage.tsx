import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Props = { emoji: string; title: string; message?: string; actionLabel?: string; onAction?: () => void };

export function StateMessage({ emoji, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.btn} accessibilityRole="button">
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emoji: { fontSize: 46 },
  title: { fontFamily: fonts.display800, fontSize: 20, color: colors.text, marginTop: 8, textAlign: 'center' },
  message: {
    fontFamily: fonts.body400,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  btn: {
    marginTop: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  btnText: { fontFamily: fonts.display700, fontSize: 14, color: colors.text },
});
