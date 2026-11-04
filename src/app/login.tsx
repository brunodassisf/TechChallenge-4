import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Field } from '@/components/Field';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { homeRouteFor } from '@/lib/admin';
import { colors, fonts, space } from '@/theme';

export default function Login() {
  const { signIn, user } = useAuth();
  const [signedIn, setSignedIn] = useState<SessionUser | null>(null);

  // Navega só depois que o contexto já tem o usuário novo (o guard do /admin depende dele).
  useEffect(() => {
    if (!signedIn || user?.id !== signedIn.id) return;
    if (homeRouteFor(signedIn) === '/admin') router.dismissTo('/admin');
    else router.back();
  }, [signedIn, user]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function submit() {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      setSignedIn(await signIn(email, password));
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors ?? {});
        if (!err.fieldErrors) setError(err.message);
      } else {
        setError('Algo deu errado. Tente de novo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.nav}>
            <IconButton label="✕" onPress={() => router.back()} accessibilityLabel="Fechar" />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Tech Challenge{'\n'}
            <Text style={styles.accent}>4</Text>
          </Text>
          <Text style={styles.subtitle}>Entre com a conta da escola.</Text>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            error={fieldErrors.email?.[0]}
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={submit}
            error={fieldErrors.password?.[0]}
          />
          <PrimaryButton label="Entrar" onPress={submit} loading={loading} />
          <Text style={styles.hint}>A mesma conta do site do Tech Challenge 3.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: space.lg },
  nav: { flexDirection: 'row', marginBottom: 18 },
  title: { fontFamily: fonts.display800, fontSize: 30, lineHeight: 32, color: colors.text, marginBottom: 6 },
  accent: { color: colors.accent },
  subtitle: { fontFamily: fonts.body400, fontSize: 13, color: colors.textMuted, marginBottom: 26 },
  error: { fontFamily: fonts.body500, fontSize: 13, color: colors.danger, marginBottom: 14 },
  hint: { fontFamily: fonts.body400, fontSize: 12, color: colors.textFaint, textAlign: 'center', marginTop: 14 },
});
