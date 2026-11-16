import { Pressable, StyleSheet, Text } from 'react-native';

import type { StudentSummary } from '@/api/types';
import { colors, fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  student: StudentSummary | null;
  onEdit: () => void;
  onReset: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function StudentActionsSheet({ student, onEdit, onReset, onDelete, onClose }: Props) {
  const options = [
    { label: '✎ Editar', onPress: onEdit, danger: false },
    { label: '🔑 Resetar senha', onPress: onReset, danger: true },
    { label: '🗑 Excluir estudante', onPress: onDelete, danger: true },
  ];
  return (
    <ConfirmSheet visible={!!student} title={student?.name ?? ''} onCancel={onClose}>
      <Text style={styles.sub}>{student?.email ?? ''}</Text>
      {options.map((o, i) => (
        <Pressable
          key={o.label}
          style={[styles.opt, i === options.length - 1 && styles.last]}
          onPress={o.onPress}
          accessibilityRole="button"
        >
          <Text style={[styles.optText, o.danger && { color: colors.danger }]}>{o.label}</Text>
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
