import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { updatePost } from '@/api/posts';
import type { PostInput } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { PostForm } from '@/components/PostForm';
import { StateMessage } from '@/components/StateMessage';
import { useHandleApiError } from '@/hooks/useAuthGuard';
import { usePost } from '@/hooks/usePost';
import { canManagePost } from '@/lib/post';
import { colors, getCategory } from '@/theme';

export default function EditPost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const handleApiError = useHandleApiError();
  const { status, post, error, reload } = usePost(id);

  useEffect(() => reload(), [reload]);

  if (status === 'loading') {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!post || !canManagePost(user, post)) {
    return (
      <View style={styles.screen}>
        <StateMessage
          emoji="🔒"
          title={post ? 'Você não pode editar este post' : 'Post não encontrado'}
          message={post ? undefined : error?.message}
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  async function submit(input: PostInput) {
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      await updatePost(id, input, token);
      router.back();
    } catch (err) {
      if (!handleApiError(err)) throw err;
    }
  }

  return (
    <PostForm
      title="Editar post"
      submitLabel="Salvar"
      initial={{ title: post.title, text: post.text, category: getCategory(post.category).value }}
      onSubmit={submit}
      onClose={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
});
