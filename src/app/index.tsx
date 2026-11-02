import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactElement } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { PostCard } from '@/components/PostCard';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonCard } from '@/components/SkeletonCard';
import { StateMessage } from '@/components/StateMessage';
import { Toast } from '@/components/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePosts } from '@/hooks/usePosts';
import { initials } from '@/lib/initials';
import { canCreatePost } from '@/lib/post';
import { colors, fonts, radius, space } from '@/theme';

export default function Home() {
  const { user, signOut } = useAuth();
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  const [toast, setToast] = useState<string | null>(aviso ?? null);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search, 300).trim();
  const { status, posts, error, refreshing, reload } = usePosts(query);

  // Roda ao focar a tela e sempre que a busca (query) muda.
  useFocusEffect(useCallback(() => reload(), [reload]));

  const hideToast = useCallback(() => {
    setToast(null);
    router.setParams({ aviso: undefined });
  }, []);

  function onAccountPress() {
    if (!user) {
      router.push('/login');
      return;
    }
    Alert.alert(user.name, 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const header = (
    <View>
      <View style={styles.top}>
        <Pressable
          onPress={onAccountPress}
          style={[styles.account, user && styles.avatar]}
          accessibilityRole="button"
          accessibilityLabel={user ? `Conta de ${user.name}` : 'Entrar'}
        >
          <Text style={styles.accountText}>{user ? initials(user.name) : 'Entrar'}</Text>
        </Pressable>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Tech Challenge{'\n'}
        <Text style={styles.titleAccent}>4</Text>
      </Text>
      <SearchBar value={search} onChangeText={setSearch} />
      {status === 'success' && query !== '' && posts.length > 0 && (
        <Text style={styles.count}>
          {posts.length} {posts.length === 1 ? 'resultado' : 'resultados'} para “{query}”
        </Text>
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
        message={error ?? 'Não conseguimos carregar os posts. Confira sua internet e tente de novo.'}
        actionLabel="Tentar de novo"
        onAction={() => reload()}
      />
    );
  } else if (query !== '') {
    empty = (
      <StateMessage
        emoji="🔭"
        title="Nada por aqui"
        message={`Nenhum post fala de “${query}”. Tente outra palavra.`}
        actionLabel="Limpar busca"
        onAction={() => setSearch('')}
      />
    );
  } else {
    empty = <StateMessage emoji="📝" title="Ainda não há posts" message="Quando um professor publicar, aparece aqui." />;
  }

  const showList = status === 'success' || (status === 'loading' && posts.length > 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={showList ? posts : []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            term={query}
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => reload({ pull: true })} tintColor={colors.text} />
        }
      />
      {canCreatePost(user) && (
        <Pressable style={styles.fab} onPress={() => router.push('/post/novo')} accessibilityRole="button">
          <Text style={styles.fabText}>＋ Novo post</Text>
        </Pressable>
      )}
      <Toast message={toast} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg, paddingBottom: 100 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: space.sm, marginBottom: 6 },
  account: { backgroundColor: colors.text, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  avatar: {
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: { fontFamily: fonts.display700, fontSize: 13, color: colors.onCard },
  title: { fontFamily: fonts.display800, fontSize: 30, lineHeight: 32, color: colors.text, marginBottom: 14 },
  titleAccent: { color: colors.accent },
  count: { fontFamily: fonts.body400, fontSize: 12, color: colors.textFaint, marginTop: -4, marginBottom: 12, marginLeft: 4 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  fabText: { fontFamily: fonts.display800, fontSize: 15, color: colors.onCard },
});
