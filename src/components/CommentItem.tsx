import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Comment } from '@/api/types';
import { Field } from '@/components/Field';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { formatDate } from '@/lib/formatDate';
import { colors, fonts, radius, space } from '@/theme';

/** `fieldError` = mensagem do campo; ausente com ok=false = erro já mostrado. */
export type SaveResult = { ok: boolean; fieldError?: string };

type Props = {
  comment: Comment;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (text: string) => Promise<SaveResult>;
  onDelete: () => void;
};

export function CommentItem({ comment, canEdit, canDelete, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await onSave(text);
    setSaving(false);
    setError(res.fieldError);
    if (res.ok) setEditing(false);
  }

  function cancel() {
    setText(comment.text);
    setError(undefined);
    setEditing(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.meta}>
          {comment.student.name} · {formatDate(comment.createdAt)}
        </Text>
        {!editing && (
          <View style={styles.actions}>
            {canEdit && (
              <IconButton label="✎" accessibilityLabel="Editar comentário" onPress={() => setEditing(true)} />
            )}
            {canDelete && (
              <IconButton label="🗑" tone="danger" accessibilityLabel="Excluir comentário" onPress={onDelete} />
            )}
          </View>
        )}
      </View>
      {editing ? (
        <>
          <Field
            label="Editar comentário"
            value={text}
            onChangeText={setText}
            multiline
            error={error}
            maxLength={1000}
            style={styles.input}
          />
          <View style={styles.editRow}>
            <View style={styles.flex}>
              <PrimaryButton label="Cancelar" tone="admin" onPress={cancel} disabled={saving} />
            </View>
            <View style={styles.flex}>
              <PrimaryButton label="Salvar" onPress={save} loading={saving} disabled={!text.trim()} />
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.text} selectable>
          {comment.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.field, padding: space.md, marginBottom: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
  meta: { fontFamily: fonts.body700, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  text: { fontFamily: fonts.body400, fontSize: 14, lineHeight: 21, color: colors.text },
  input: { minHeight: 90 },
  editRow: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
