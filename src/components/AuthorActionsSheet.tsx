import { Pressable, StyleSheet, Text } from 'react-native';

import type { AuthorSummary } from '@/api/types';
import { authorActions, authorSubtitle, type AuthorAction } from '@/lib/admin';
import { colors, fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  author: AuthorSummary | null;
  onRename: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onRemove: () => void;
  onClose: () => void;
};

const LABELS: Record<AuthorAction, string> = {
  rename: '✎ Renomear',
  deactivate: '⏸ Desativar professor',
  reactivate: '▶ Reativar professor',
  remove: '🗑 Remover professor',
};

const DANGER: readonly AuthorAction[] = ['deactivate', 'remove'];

export function AuthorActionsSheet({ author, onRename, onDeactivate, onReactivate, onRemove, onClose }: Props) {
  const handlers: Record<AuthorAction, () => void> = {
    rename: onRename,
    deactivate: onDeactivate,
    reactivate: onReactivate,
    remove: onRemove,
  };
  const actions = author ? authorActions(author) : [];
  return (
    <ConfirmSheet visible={!!author} title={author?.name ?? ''} onCancel={onClose}>
      <Text style={styles.sub}>{author ? authorSubtitle(author) : ''}</Text>
      {actions.map((action, i) => (
        <Pressable
          key={action}
          style={[styles.opt, i === actions.length - 1 && styles.last]}
          onPress={handlers[action]}
          accessibilityRole="button"
        >
          <Text style={[styles.optText, DANGER.includes(action) && { color: colors.danger }]}>{LABELS[action]}</Text>
        </Pressable>
      ))}
    </ConfirmSheet>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.body400, fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  opt: { paddingVertical: 14, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  last: { borderBottomWidth: 0, marginBottom: 4 },
  optText: { fontFamily: fonts.display700, fontSize: 15, color: colors.text },
});
