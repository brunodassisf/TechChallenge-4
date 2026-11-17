import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { createComment, deleteComment, updateComment } from '@/api/comments';
import type { Comment, Post } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { CommentItem, type SaveResult } from '@/components/CommentItem';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { useComments } from '@/hooks/useComments';
import { canComment, canDeleteComment, canEditComment } from '@/lib/comment';
import { toFormError } from '@/lib/formError';
import { colors, fonts } from '@/theme';

type Props = { post: Pick<Post, 'id' | 'authorId'> };

export function CommentsSection({ post }: Props) {
  const { user } = useAuth();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const { status, comments, error, reload } = useComments(post.id);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => reload(), [reload]));

  /** 401 desloga; erro do campo text volta para o campo; o resto vira Alert. */
  function fail(err: unknown, title: string): SaveResult {
    if (handleApiError(err)) return { ok: false };
    const form = toFormError(err);
    const fieldError = form.fieldErrors.text?.[0];
    if (!fieldError) Alert.alert(title, form.error ?? 'Tente de novo.');
    return { ok: false, fieldError };
  }

  async function send() {
    const token = requireToken();
    if (!token) return;
    setSending(true);
    try {
      await createComment(post.id, draft, token);
      setDraft('');
      setDraftError(undefined);
      reload();
    } catch (err) {
      setDraftError(fail(err, 'Não foi possível comentar').fieldError);
    } finally {
      setSending(false);
    }
  }

  async function save(comment: Comment, text: string): Promise<SaveResult> {
    const token = requireToken();
    if (!token) return { ok: false };
    try {
      await updateComment(comment.id, text, token);
      reload();
      return { ok: true };
    } catch (err) {
      return fail(err, 'Não foi possível salvar');
    }
  }

  async function confirmDelete() {
    if (!removing) return;
    const token = requireToken();
    if (!token) {
      setRemoving(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteComment(removing.id, token);
      reload();
    } catch (err) {
      fail(err, 'Não foi possível excluir');
    } finally {
      setDeleting(false);
      setRemoving(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        Comentários{status === 'success' ? ` (${comments.length})` : ''}
      </Text>

      {status === 'loading' && <ActivityIndicator color={colors.text} style={styles.loading} />}

      {status === 'error' && (
        <View style={styles.state}>
          <Text style={styles.muted}>{error?.message ?? 'Não foi possível carregar os comentários.'}</Text>
          <PrimaryButton label="Tentar de novo" tone="admin" onPress={reload} />
        </View>
      )}

      {status === 'success' && comments.length === 0 && (
        <Text style={[styles.muted, styles.state]}>Seja o primeiro a comentar.</Text>
      )}

      {status === 'success' &&
        comments.map((c) => (
          // updatedAt na key: depois de editar, o item remonta com o texto do servidor.
          <CommentItem
            key={`${c.id}-${c.updatedAt}`}
            comment={c}
            canEdit={canEditComment(user, c)}
            canDelete={canDeleteComment(user, c, post)}
            onSave={(text) => save(c, text)}
            onDelete={() => setRemoving(c)}
          />
        ))}

      {canComment(user) && (
        <View style={styles.composer}>
          <Field
            label="Seu comentário"
            value={draft}
            onChangeText={setDraft}
            placeholder="Escreva o que achou do post"
            multiline
            maxLength={1000}
            error={draftError}
            style={styles.input}
          />
          <PrimaryButton label="Enviar" onPress={send} loading={sending} disabled={!draft.trim()} />
        </View>
      )}

      <ConfirmSheet
        visible={!!removing}
        title="Excluir este comentário?"
        message="Ele vai sumir para todos. Não dá para desfazer."
        confirmLabel="Excluir comentário"
        onConfirm={confirmDelete}
        onCancel={() => setRemoving(null)}
        loading={deleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  title: { fontFamily: fonts.display800, fontSize: 18, color: colors.text, marginBottom: 12 },
  loading: { marginVertical: 12 },
  state: { gap: 10, marginBottom: 12 },
  muted: { fontFamily: fonts.body400, fontSize: 14, color: colors.textMuted },
  composer: { marginTop: 8 },
  input: { minHeight: 90 },
});
