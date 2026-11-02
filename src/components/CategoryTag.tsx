import { StyleSheet, Text } from 'react-native';

import { colors, fonts, getCategory, radius } from '@/theme';

export function CategoryTag({ category }: { category: string }) {
  return <Text style={styles.tag}>{getCategory(category).label}</Text>;
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tagBackground,
    color: colors.onCard,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 11,
    fontFamily: fonts.display700,
    overflow: 'hidden',
    marginBottom: 8,
  },
});
