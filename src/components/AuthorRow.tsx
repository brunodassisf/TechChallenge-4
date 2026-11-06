import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AuthorSummary } from '@/api/types';
import { authorSubtitle, avatarColor } from '@/lib/admin';
import { initials } from '@/lib/initials';
import { colors, fonts, space } from '@/theme';

type Props = { author: AuthorSummary; index: number; onPress: () => void };

export function AuthorRow({ author, index, onPress }: Props) {
  const subtitle = authorSubtitle(author);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !author.active && styles.inactive, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={`${author.name}${author.active ? '' : ', inativo'}, ${subtitle}. Abrir ações`}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor(index) }]}>
        <Text style={styles.avatarText}>{initials(author.name)}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, styles.nameFlex]} numberOfLines={1}>
            {author.name}
          </Text>
          {!author.active && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Inativo</Text>
            </View>
          )}
        </View>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>
      <Text style={styles.more}>⋯</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingVertical: space.md,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display800, fontSize: 14, color: colors.onCard },
  info: { flex: 1 },
  name: { fontFamily: fonts.display700, fontSize: 16, color: colors.text },
  sub: { fontFamily: fonts.body400, fontSize: 12, color: colors.textFaint, marginTop: 2 },
  more: { fontSize: 18, color: colors.textFaint },
  inactive: { opacity: 0.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  nameFlex: { flexShrink: 1 },
  tag: { backgroundColor: colors.subtle, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: fonts.body700, fontSize: 10, color: colors.text },
});
