import { Pressable, StyleSheet } from 'react-native';

import type { Post } from '@/api/types';
import { excerpt } from '@/lib/excerpt';
import { authorName } from '@/lib/post';
import { colors, fonts, getCategory, radius, space } from '@/theme';
import { CategoryTag } from './CategoryTag';
import { HighlightText } from './HighlightText';

type Props = { post: Post; term: string; onPress: () => void };

export function PostCard({ post, term, onPress }: Props) {
  const cat = getCategory(post.category);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${post.title}, por ${authorName(post)}, ${cat.label}`}
      style={({ pressed }) => [styles.card, { backgroundColor: cat.color }, pressed && styles.pressed]}
    >
      <CategoryTag category={post.category} />
      <HighlightText text={post.title} term={term} style={styles.title} numberOfLines={3} />
      <HighlightText text={excerpt(post.text)} term={term} style={styles.desc} numberOfLines={2} />
      <HighlightText text={authorName(post)} term={term} style={styles.author} numberOfLines={1} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.lg, marginBottom: space.md },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  title: { fontFamily: fonts.display800, fontSize: 18, lineHeight: 21, color: colors.onCard, marginBottom: 4 },
  desc: { fontFamily: fonts.body400, fontSize: 13, lineHeight: 18, color: colors.onCardMuted, marginBottom: 8 },
  author: { fontFamily: fonts.display700, fontSize: 12, color: colors.onCard },
});
