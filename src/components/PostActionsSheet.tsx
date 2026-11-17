import { Pressable, StyleSheet, Text } from 'react-native';

import type { Post } from '@/api/types';
import { authorName } from '@/lib/post';
import { colors, fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = { post: Post | null; onEdit: () => void; onDelete: () => void; onClose: () => void };

export function PostActionsSheet({ post, onEdit, onDelete, onClose }: Props) {
  return (
    <ConfirmSheet visible={!!post} title={post?.title ?? ''} onCancel={onClose}>
      <Text style={styles.sub}>{post ? `por ${authorName(post)}` : ''}</Text>
      <Pressable style={styles.opt} onPress={onEdit} accessibilityRole="button">
        <Text style={styles.optText}>✎ Editar post</Text>
      </Pressable>
      <Pressable style={[styles.opt, styles.last]} onPress={onDelete} accessibilityRole="button">
        <Text style={[styles.optText, { color: colors.danger }]}>🗑 Excluir post</Text>
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
