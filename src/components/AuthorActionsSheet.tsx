import { Pressable, StyleSheet, Text } from 'react-native';

import type { AuthorSummary } from '@/api/types';
import { authorSubtitle } from '@/lib/admin';
import { colors, fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  author: AuthorSummary | null;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export function AuthorActionsSheet({ author, onRename, onRemove, onClose }: Props) {
  return (
    <ConfirmSheet visible={!!author} title={author?.name ?? ''} onCancel={onClose}>
      <Text style={styles.sub}>{author ? authorSubtitle(author) : ''}</Text>
      <Pressable style={styles.opt} onPress={onRename} accessibilityRole="button">
        <Text style={styles.optText}>✎ Renomear</Text>
      </Pressable>
      <Pressable style={[styles.opt, styles.last]} onPress={onRemove} accessibilityRole="button">
        <Text style={[styles.optText, { color: colors.danger }]}>🗑 Remover professor</Text>
      </Pressable>
    </ConfirmSheet>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.body400, fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  opt: { paddingVertical: 14, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  last: { borderBottomWidth: 0, marginBottom: 4 },
  optText: { fontFamily: fonts.display700, fontSize: 15, color: colors.text },
});
