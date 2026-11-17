import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactElement } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthorHasPostsError, deleteAuthor, setAuthorActive } from '@/api/authors';
import { ApiError } from '@/api/client';
import { deletePost } from '@/api/posts';
import { deleteStudent, resetStudentPassword } from '@/api/students';
import type { AuthorSummary, Post, StudentSummary } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { AuthorActionsSheet } from '@/components/AuthorActionsSheet';
import { AuthorRow } from '@/components/AuthorRow';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { DeactivateAuthorSheet } from '@/components/DeactivateAuthorSheet';
import { PostActionsSheet } from '@/components/PostActionsSheet';
import { PostCard } from '@/components/PostCard';
import { RemoveAuthorSheet } from '@/components/RemoveAuthorSheet';
import { SkeletonCard } from '@/components/SkeletonCard';
import { StateMessage } from '@/components/StateMessage';
import { StudentActionsSheet } from '@/components/StudentActionsSheet';
import { StudentRow } from '@/components/StudentRow';
import { Toast } from '@/components/Toast';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { useAuthors } from '@/hooks/useAuthors';
import { usePosts } from '@/hooks/usePosts';
import { useStudents } from '@/hooks/useStudents';
import { blockedCount, postCountLabel, sortAuthors, studentCountLabel, teacherCountLabel } from '@/lib/admin';
import { initials } from '@/lib/initials';
import { colors, fonts, radius, space } from '@/theme';

type Removing = { author: AuthorSummary; postCount: number };
type Tab = 'professores' | 'estudantes' | 'posts';

const TAB_LABELS: Record<Tab, string> = { professores: 'Professores', estudantes: 'Estudantes', posts: 'Posts' };
const TAB_NOUNS: Record<Tab, string> = { professores: 'professores', estudantes: 'estudantes', posts: 'posts' };

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
  const [tab, setTab] = useState<Tab>('professores');
  const studentsState = useStudents();
  const postsState = usePosts('');
  const onStudents = tab === 'estudantes';
  const onPosts = tab === 'posts';
  const active = onStudents ? studentsState : onPosts ? postsState : { status, error, refreshing, reload };
  const activeCount = onStudents ? studentsState.students.length : onPosts ? postsState.posts.length : authors.length;
  const reloadStudents = studentsState.reload;
  const reloadPosts = postsState.reload;
  const [post, setPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [confirming, setConfirming] = useState<{ student: StudentSummary; action: 'reset' | 'delete' } | null>(
    null,
  );

  // Foco da tela e troca de aba recarregam só a aba ativa.
  useFocusEffect(
    useCallback(() => {
      if (onStudents) reloadStudents();
      else if (onPosts) reloadPosts();
      else reload();
    }, [onStudents, onPosts, reloadStudents, reloadPosts, reload]),
  );

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

  function openEditStudent() {
    if (!student) return;
    const { id, name, email } = student;
    setStudent(null);
    router.push({ pathname: '/admin/estudante/[id]/editar', params: { id, name, email } });
  }

  function askStudent(action: 'reset' | 'delete') {
    if (!student) return;
    setConfirming({ student, action });
    setStudent(null);
  }

  async function confirmStudent() {
    if (!confirming) return;
    const token = requireToken();
    if (!token) {
      setConfirming(null);
      return;
    }
    const { student: target, action } = confirming;
    setBusy(true);
    try {
      if (action === 'reset') await resetStudentPassword(target.id, token);
      else await deleteStudent(target.id, token);
      setConfirming(null);
      router.setParams({ aviso: action === 'reset' ? 'Senha resetada' : 'Estudante excluído' });
      if (action === 'delete') reloadStudents();
    } catch (err) {
      setConfirming(null);
      if (handleApiError(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Estudante não encontrado', 'Ele pode ter sido excluído.');
        reloadStudents();
        return;
      }
      Alert.alert('Não foi possível concluir', err instanceof ApiError ? err.message : 'Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function openEditPost() {
    if (!post) return;
    const { id } = post;
    setPost(null);
    router.push({ pathname: '/post/[id]/editar', params: { id } });
  }

  async function confirmDeletePost() {
    if (!deletingPost) return;
    const token = requireToken();
    if (!token) {
      setDeletingPost(null);
      return;
    }
    setBusy(true);
    try {
      await deletePost(deletingPost.id, token);
      setDeletingPost(null);
      router.setParams({ aviso: 'Post excluído' });
      reloadPosts();
    } catch (err) {
      setDeletingPost(null);
      if (handleApiError(err)) return;
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Post não encontrado', 'Ele pode ter sido excluído.');
        reloadPosts();
        return;
      }
      Alert.alert('Não foi possível excluir', err instanceof ApiError ? err.message : 'Tente de novo.');
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
      <View style={styles.tabs} accessibilityRole="tablist">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {TAB_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {TAB_LABELS[tab]}
      </Text>
      {active.status === 'success' && activeCount > 0 && (
        <Text style={styles.sub}>
          {onStudents
            ? studentCountLabel(activeCount)
            : onPosts
              ? postCountLabel(activeCount)
              : teacherCountLabel(activeCount, inactiveCount)}
        </Text>
      )}
    </View>
  );

  let empty: ReactElement;
  if (active.status === 'loading') {
    empty = (
      <View>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  } else if (active.status === 'error') {
    empty = (
      <StateMessage
        emoji="📡"
        title="Sem conexão com o servidor"
        message={active.error ?? `Não conseguimos carregar os ${TAB_NOUNS[tab]}.`}
        actionLabel="Tentar de novo"
        onAction={() => active.reload()}
      />
    );
  } else if (onPosts) {
    empty = <StateMessage emoji="📝" title="Nenhum post publicado" message="Os posts dos professores aparecem aqui." />;
  } else if (onStudents) {
    empty = (
      <StateMessage
        emoji="🎒"
        title="Nenhum estudante cadastrado"
        message="Os estudantes aparecem aqui depois do cadastro."
      />
    );
  } else {
    empty = (
      <StateMessage emoji="🧑‍🏫" title="Nenhum professor cadastrado" message="Cadastre o primeiro pelo botão abaixo." />
    );
  }

  const showList = active.status === 'success' || (active.status === 'loading' && activeCount > 0);
  const listProps = {
    ListHeaderComponent: header,
    ListEmptyComponent: empty,
    contentContainerStyle: [styles.content, { paddingBottom: 100 + insets.bottom }],
    refreshControl: (
      <RefreshControl
        refreshing={active.refreshing}
        onRefresh={() => active.reload({ pull: true })}
        tintColor={colors.text}
      />
    ),
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {onPosts ? (
        <FlatList
          {...listProps}
          data={showList ? postsState.posts : []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} term="" onPress={() => setPost(item)} />}
        />
      ) : onStudents ? (
        <FlatList
          {...listProps}
          data={showList ? studentsState.students : []}
          keyExtractor={(s) => s.id}
          renderItem={({ item, index }) => (
            <StudentRow student={item} index={index} onPress={() => setStudent(item)} />
          )}
        />
      ) : (
        <FlatList
          {...listProps}
          data={showList ? sorted : []}
          keyExtractor={(a) => a.id}
          renderItem={({ item, index }) => <AuthorRow author={item} index={index} onPress={() => setSelected(item)} />}
        />
      )}
      {tab === 'professores' && (
        <Pressable
          style={[styles.fab, { bottom: 24 + insets.bottom }]}
          onPress={() => router.push('/admin/novo')}
          accessibilityRole="button"
          accessibilityLabel="Cadastrar professor"
        >
          <Text style={styles.fabText}>＋ Professor</Text>
        </Pressable>
      )}
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
      <StudentActionsSheet
        student={student}
        onEdit={openEditStudent}
        onReset={() => askStudent('reset')}
        onDelete={() => askStudent('delete')}
        onClose={() => setStudent(null)}
      />
      <ConfirmSheet
        visible={!!confirming}
        title={
          confirming?.action === 'reset'
            ? `Resetar a senha de ${confirming.student.name}?`
            : `Excluir ${confirming?.student.name ?? ''}?`
        }
        message={
          confirming?.action === 'reset'
            ? 'Na próxima entrada, o estudante usa a senha padrão e cria uma nova.'
            : 'A conta de login também é apagada.'
        }
        confirmLabel={confirming?.action === 'reset' ? 'Resetar senha' : 'Excluir'}
        onConfirm={confirmStudent}
        onCancel={() => setConfirming(null)}
        loading={busy}
      />
      <PostActionsSheet
        post={post}
        onEdit={openEditPost}
        onDelete={() => {
          setDeletingPost(post);
          setPost(null);
        }}
        onClose={() => setPost(null)}
      />
      <ConfirmSheet
        visible={!!deletingPost}
        title={`Excluir "${deletingPost?.title ?? ''}"?`}
        message="Não dá para desfazer."
        confirmLabel="Excluir"
        onConfirm={confirmDeletePost}
        onCancel={() => setDeletingPost(null)}
        loading={busy}
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
  tabs: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.subtle,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: space.md,
  },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.admin },
  tabText: { fontFamily: fonts.display700, fontSize: 13, color: colors.textFaint },
  tabTextOn: { color: colors.onCard },
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
