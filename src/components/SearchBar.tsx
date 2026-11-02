import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Props = { value: string; onChangeText: (t: string) => void };

export function SearchBar({ value, onChangeText }: Props) {
  const active = value.length > 0;
  return (
    <View style={[styles.box, active && styles.active]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar por título, autor ou texto"
        placeholderTextColor={colors.textFaint}
        style={[styles.input, active && styles.inputActive]}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Buscar posts"
      />
      {active && (
        <Pressable onPress={() => onChangeText('')} hitSlop={12} accessibilityLabel="Limpar busca">
          <Text style={styles.clear}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    marginBottom: 14,
    minHeight: 46,
  },
  active: { backgroundColor: colors.text },
  icon: { marginRight: 8, fontSize: 14 },
  input: { flex: 1, fontFamily: fonts.body400, fontSize: 14, color: colors.text, paddingVertical: 10 },
  inputActive: { color: colors.onCard },
  clear: { fontSize: 14, color: colors.onCard, paddingLeft: 8 },
});
