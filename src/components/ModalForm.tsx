import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, space } from '@/theme';
import { IconButton } from './IconButton';

type Props = { title: string; error: string | null; onClose: () => void; children: ReactNode };

export function ModalForm({ title, error, onClose, children }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.nav}>
            <IconButton label="✕" onPress={onClose} accessibilityLabel="Fechar" />
            <Text style={styles.navTitle} accessibilityRole="header">
              {title}
            </Text>
            <View style={styles.navSpacer} />
          </View>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: 40 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  navTitle: { fontFamily: fonts.display700, fontSize: 16, color: colors.text },
  navSpacer: { width: 40 },
  error: { fontFamily: fonts.body500, fontSize: 13, color: colors.danger, marginBottom: 12 },
});
