import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

type Props = { message: string | null; onHide: () => void };

export function Toast({ message, onHide }: Props) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onHide, 2500);
    return () => clearTimeout(t);
  }, [message, onHide]);

  if (!message) return null;
  return (
    <View
      style={[styles.toast, { bottom: 28 + insets.bottom }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.text}>✓ {message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.success,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  text: { fontFamily: fonts.body700, fontSize: 13, color: colors.onCard },
});
