import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, colors, fonts, radius, type Category } from '@/theme';

type Props = { value: Category; onChange: (c: Category) => void };

export function CategoryChips({ value, onChange }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Matéria">
      {CATEGORIES.map((c) => {
        const selected = c.value === value;
        return (
          <Pressable
            key={c.value}
            onPress={() => onChange(c.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={c.label}
            style={[styles.chip, { backgroundColor: c.color }, !selected && styles.off, selected && styles.on]}
          >
            <Text style={styles.text}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  off: { opacity: 0.45 },
  on: { borderColor: colors.text },
  text: { fontFamily: fonts.display700, fontSize: 12, color: colors.onCard },
});
