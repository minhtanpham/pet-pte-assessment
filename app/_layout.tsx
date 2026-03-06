import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks';
import { store, persistor } from '@/store';
import type { AppDispatch, RootState } from '@/store';
import { setUser, clearUser, setLoading } from '@/store/slices/auth-slice';
import { supabase } from '@/lib/supabase';
import { restoreSession } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/notifications';
import { publishPublicKey } from '@/lib/encryption';

export const unstable_settings = {
  anchor: '(tabs)',
};

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, string> | undefined;
  if (!data) return;
  if (data.type === 'message' && data.conversationId) {
    router.push(`/chat/${data.conversationId}`);
  } else if (data.type === 'group_message' && data.groupId) {
    router.push(`/group/${data.groupId}`);
  }
}

function AuthGate() {
  const dispatch = useDispatch<AppDispatch>();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Restore persisted session on launch
    restoreSession(dispatch)
      .catch(() => dispatch(setLoading(false)))
      .finally(() => dispatch(setLoading(false)));

    // Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        dispatch(setUser({
          uid: user.id,
          email: user.email ?? '',
          displayName: user.user_metadata?.display_name ?? null,
        }));
        registerForPushNotifications(user.id).catch(() => {});
        publishPublicKey(user.id).catch(() => {});
      } else {
        dispatch(clearUser());
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // Navigate when user taps a notification
  useEffect(() => {
    // App opened from killed state via notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    // App in background/foreground and notification tapped
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat', headerBackTitle: 'Back' }} />
        <Stack.Screen
          name="call/[id]"
          options={{ title: 'Video Call', headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate
          loading={<View style={{ flex: 1 }}><ActivityIndicator style={{ flex: 1 }} /></View>}
          persistor={persistor}>
          <RootLayoutInner />
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}
