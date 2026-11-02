import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { radius, space } from '@/theme';

export function SkeletonCard() {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.sk, { opacity }]} accessibilityLabel="Carregando" />;
}

const styles = StyleSheet.create({
  sk: { height: 118, borderRadius: radius.card, marginBottom: space.md, backgroundColor: 'rgba(255,255,255,0.12)' },
});
