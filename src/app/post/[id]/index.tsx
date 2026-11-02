import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { deletePost } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { CategoryTag } from '@/components/CategoryTag';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { IconButton } from '@/components/IconButton';
import { StateMessage } from '@/components/StateMessage';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { usePost } from '@/hooks/usePost';
import { formatDate } from '@/lib/formatDate';
import { authorName, canManagePost } from '@/lib/post';
import { colors, fonts, getCategory, radius, space } from '@/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const { status, post, error, reload } = usePost(id);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => reload(), [reload]));

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function confirmDelete() {
    if (!post) return;
    const token = requireToken();
    if (!token) {
      setConfirming(false);
      return;
    }
    setDeleting(true);
    try {
      await deletePost(post.id, token);
      setConfirming(false);
      router.dismissTo({ pathname: '/', params: { aviso: 'Post excluído' } });
    } catch (err) {
      setConfirming(false);
      if (!handleApiError(err)) {
        Alert.alert('Não foi possível excluir', err instanceof ApiError ? err.message : 'Tente de novo.');
      }
    } finally {
      setDeleting(false);
    }
  }

  if (status === 'loading' && !post) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  if (!post) {
    const notFound = error?.status === 404;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.nav, styles.padded]}>
          <IconButton label="←" onPress={back} accessibilityLabel="Voltar" />
        </View>
        <StateMessage
          emoji={notFound ? '🔎' : '📡'}
          title={notFound ? 'Post não encontrado' : 'Sem conexão com o servidor'}
          message={notFound ? 'Ele pode ter sido excluído.' : error?.message}
          actionLabel={notFound ? 'Voltar' : 'Tentar de novo'}
          onAction={notFound ? back : reload}
        />
      </SafeAreaView>
    );
  }

  const cat = getCategory(post.category);
  const canManage = canManagePost(user, post);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.nav}>
          <IconButton label="←" onPress={back} accessibilityLabel="Voltar" />
          {canManage && (
            <View style={styles.actions}>
              <IconButton
                label="✎ Editar"
                accessibilityLabel="Editar post"
                onPress={() => router.push({ pathname: '/post/[id]/editar', params: { id: post.id } })}
              />
              <IconButton
                label="🗑"
                tone="danger"
                accessibilityLabel="Excluir post"
                onPress={() => setConfirming(true)}
              />
            </View>
          )}
        </View>
        <View style={[styles.hero, { backgroundColor: cat.color }]}>
          <CategoryTag category={post.category} />
          <Text style={styles.title} accessibilityRole="header">
            {post.title}
          </Text>
          <Text style={styles.by}>
            {authorName(post)} · {formatDate(post.createdAt)}
          </Text>
        </View>
        <Text style={styles.body} selectable>
          {post.text}
        </Text>
      </ScrollView>
      <ConfirmSheet
        visible={confirming}
        title="Excluir este post?"
        message={`“${post.title}” vai sumir para todos os alunos. Não dá para desfazer.`}
        confirmLabel="Excluir post"
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(false)}
        loading={deleting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  padded: { paddingHorizontal: space.lg },
  content: { padding: space.lg, paddingBottom: 40 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  hero: { borderRadius: radius.hero, padding: 18, marginBottom: 16 },
  title: { fontFamily: fonts.display800, fontSize: 26, lineHeight: 28, color: colors.onCard, marginBottom: 10 },
  by: { fontFamily: fonts.body700, fontSize: 12, color: colors.onCard },
  body: { fontFamily: fonts.body400, fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.88)' },
});
