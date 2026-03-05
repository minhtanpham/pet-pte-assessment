import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import auth from '@react-native-firebase/auth';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { store, persistor } from '@/store';
import type { AppDispatch, RootState } from '@/store';
import { setUser, clearUser, setLoading } from '@/store/slices/auth-slice';
import { restoreSession } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/notifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate() {
  const dispatch = useDispatch<AppDispatch>();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Attempt to restore session from SecureStore first
    restoreSession(dispatch).catch(() => dispatch(setLoading(false)));

    // Firebase auth state listener
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        dispatch(setUser({
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName,
        }));
        registerForPushNotifications(user.uid).catch(() => {});
      } else {
        dispatch(clearUser());
      }
    });
    return unsubscribe;
  }, [dispatch]);

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
    <Provider store={store}>
      <PersistGate
        loading={<View style={{ flex: 1 }}><ActivityIndicator style={{ flex: 1 }} /></View>}
        persistor={persistor}>
        <RootLayoutInner />
      </PersistGate>
    </Provider>
  );
}
