import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactElement } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthorHasPostsError, deleteAuthor, setAuthorActive } from '@/api/authors';
import { ApiError } from '@/api/client';
import type { AuthorSummary } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { AuthorActionsSheet } from '@/components/AuthorActionsSheet';
import { AuthorRow } from '@/components/AuthorRow';
import { DeactivateAuthorSheet } from '@/components/DeactivateAuthorSheet';
import { RemoveAuthorSheet } from '@/components/RemoveAuthorSheet';
import { SkeletonCard } from '@/components/SkeletonCard';
import { StateMessage } from '@/components/StateMessage';
import { Toast } from '@/components/Toast';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { useAuthors } from '@/hooks/useAuthors';
import { blockedCount, sortAuthors, teacherCountLabel } from '@/lib/admin';
import { initials } from '@/lib/initials';
import { colors, fonts, radius, space } from '@/theme';

type Removing = { author: AuthorSummary; postCount: number };

export default function AdminPanel() {
  const { user, signOut } = useAuth();
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  const insets = useSafeAreaInsets();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();
  const { status, authors, error, refreshing, reload } = useAuthors();
  const [selected, setSelected] = useState<AuthorSummary | null>(null);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [deactivating, setDeactivating] = useState<AuthorSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const sorted = sortAuthors(authors);
  const inactiveCount = authors.filter((a) => !a.active).length;

  useFocusEffect(useCallback(() => reload(), [reload]));

  const hideToast = useCallback(() => {
    router.setParams({ aviso: undefined });
  }, []);

  function onAccountPress() {
    if (!user) return;
    Alert.alert(user.name, 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  function openRename() {
    if (!selected) return;
    const { id, name } = selected;
    setSelected(null);
    router.push({ pathname: '/admin/[id]/renomear', params: { id, name } });
  }

  function openRemove() {
    if (!selected) return;
    setRemoving({ author: selected, postCount: selected.postCount });
    setSelected(null);
  }

  function openDeactivate() {
    if (!selected) return;
    setDeactivating(selected);
    setSelected(null);
  }

  function reactivateSelected() {
    if (!selected) return;
    const author = selected;
    setSelected(null);
    changeActive(author, true, () => {});
  }

  /** 401 → login; 404 → avisa e recarrega; resto → alerta com a mensagem da API. */
  function showError(err: unknown, title: string) {
    if (handleApiError(err)) return;
    if (err instanceof ApiError && err.status === 404) {
      Alert.alert('Professor não encontrado', 'Ele pode ter sido removido.');
      reload();
      return;
    }
    Alert.alert(title, err instanceof ApiError ? err.message : 'Tente de novo.');
  }

  async function changeActive(author: AuthorSummary, active: boolean, close: () => void) {
    const token = requireToken();
    if (!token) {
      close();
      return;
    }
    setBusy(true);
    try {
      await setAuthorActive(author.id, active, token);
      close();
      router.setParams({ aviso: active ? 'Professor reativado' : 'Professor desativado' });
      reload();
    } catch (err) {
      close();
      showError(err, active ? 'Não foi possível reativar' : 'Não foi possível desativar');
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    const token = requireToken();
    if (!token) {
      setRemoving(null);
      return;
    }
    setBusy(true);
    try {
      await deleteAuthor(removing.author.id, token);
      setRemoving(null);
      router.setParams({ aviso: 'Professor removido' });
      reload();
    } catch (err) {
      if (err instanceof AuthorHasPostsError) {
        // Alguém publicou nesse meio-tempo: troca para a versão bloqueada.
        setRemoving({ author: removing.author, postCount: blockedCount(err.postCount, removing.author.postCount) });
        reload();
        return;
      }
      setRemoving(null);
      showError(err, 'Não foi possível remover');
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <View>
      <View style={styles.top}>
        <Pressable onPress={() => router.push('/')} style={styles.pill} accessibilityRole="button">
          <Text style={styles.pillText}>📚 Ver posts</Text>
        </Pressable>
        <Pressable
          onPress={onAccountPress}
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel={user ? `Conta de ${user.name}` : 'Conta'}
        >
          <Text style={styles.avatarText}>{initials(user?.name)}</Text>
        </Pressable>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Administração</Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Professores
      </Text>
      {status === 'success' && authors.length > 0 && (
        <Text style={styles.sub}>{teacherCountLabel(authors.length, inactiveCount)}</Text>
      )}
    </View>
  );

  let empty: ReactElement;
  if (status === 'loading') {
    empty = (
      <View>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  } else if (status === 'error') {
    empty = (
      <StateMessage
        emoji="📡"
        title="Sem conexão com o servidor"
        message={error ?? 'Não conseguimos carregar os professores.'}
        actionLabel="Tentar de novo"
        onAction={() => reload()}
      />
    );
  } else {
    empty = (
      <StateMessage emoji="🧑‍🏫" title="Nenhum professor cadastrado" message="Cadastre o primeiro pelo botão abaixo." />
    );
  }

  const showList = status === 'success' || (status === 'loading' && authors.length > 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={showList ? sorted : []}
        keyExtractor={(a) => a.id}
        renderItem={({ item, index }) => <AuthorRow author={item} index={index} onPress={() => setSelected(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => reload({ pull: true })} tintColor={colors.text} />
        }
      />
      <Pressable
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => router.push('/admin/novo')}
        accessibilityRole="button"
        accessibilityLabel="Cadastrar professor"
      >
        <Text style={styles.fabText}>＋ Professor</Text>
      </Pressable>
      <AuthorActionsSheet
        author={selected}
        onRename={openRename}
        onDeactivate={openDeactivate}
        onReactivate={reactivateSelected}
        onRemove={openRemove}
        onClose={() => setSelected(null)}
      />
      <DeactivateAuthorSheet
        author={deactivating}
        loading={busy}
        onConfirm={() => deactivating && changeActive(deactivating, false, () => setDeactivating(null))}
        onClose={() => setDeactivating(null)}
      />
      <RemoveAuthorSheet
        author={removing?.author ?? null}
        postCount={removing?.postCount ?? 0}
        loading={busy}
        onConfirm={confirmRemove}
        onDeactivate={() => removing && changeActive(removing.author, false, () => setRemoving(null))}
        onClose={() => setRemoving(null)}
      />
      <Toast message={aviso ?? null} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, marginBottom: 8 },
  pill: { backgroundColor: colors.subtle, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { fontFamily: fonts.display700, fontSize: 13, color: colors.text },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display700, fontSize: 13, color: colors.onCard },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.admin,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: { fontFamily: fonts.display700, fontSize: 11, color: colors.onCard },
  title: { fontFamily: fonts.display800, fontSize: 30, lineHeight: 32, color: colors.text, marginBottom: 4 },
  sub: { fontFamily: fonts.body400, fontSize: 12, color: colors.textFaint, marginBottom: 14 },
  fab: {
    position: 'absolute',
    right: 18,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.admin,
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  fabText: { fontFamily: fonts.display800, fontSize: 15, color: colors.onCard },
});
