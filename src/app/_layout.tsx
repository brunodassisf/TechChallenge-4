import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { router, Stack, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { isAdmin } from '@/lib/admin';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { ready, user } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });
  const done = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (done) SplashScreen.hideAsync();
  }, [done]);

  const navReady = !!useRootNavigationState()?.key;
  const startChecked = useRef(false);

  // Só na abertura do app: admin já logado começa no Painel.
  useEffect(() => {
    if (!done || !navReady || startChecked.current) return;
    startChecked.current = true;
    if (isAdmin(user)) router.replace('/admin');
  }, [done, navReady, user]);

  if (!done) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post/novo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post/[id]/index" />
        <Stack.Screen name="post/[id]/editar" options={{ presentation: 'modal' }} />
        <Stack.Protected guard={isAdmin(user)}>
          <Stack.Screen name="admin/index" />
          <Stack.Screen name="admin/novo" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin/[id]/renomear" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootStack />
    </AuthProvider>
  );
}
