import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { splitHighlight } from '@/lib/highlight';
import { colors } from '@/theme';

type Props = { text: string; term: string; style?: StyleProp<TextStyle>; numberOfLines?: number };

export function HighlightText({ text, term, style, numberOfLines }: Props) {
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {splitHighlight(text, term).map((part, i) =>
        part.match ? (
          <Text key={i} style={styles.mark}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: { backgroundColor: colors.onCard, color: colors.text },
});
