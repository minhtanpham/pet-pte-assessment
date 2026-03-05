import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { setUser, clearUser } from '@/store/slices/auth-slice';
import type { AppDispatch } from '@/store';

const TOKEN_KEY = 'auth_token';

export async function login(email: string, password: string, dispatch: AppDispatch): Promise<void> {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  const token = await credential.user.getIdToken();
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  dispatch(setUser({
    uid: credential.user.uid,
    email: credential.user.email ?? email,
    displayName: credential.user.displayName,
  }));
}

export async function register(
  email: string,
  password: string,
  displayName: string,
  dispatch: AppDispatch,
): Promise<void> {
  const credential = await auth().createUserWithEmailAndPassword(email, password);
  await credential.user.updateProfile({ displayName });
  const token = await credential.user.getIdToken();
  await SecureStore.setItemAsync(TOKEN_KEY, token);

  // Store user profile in Firestore
  await firestore().collection('users').doc(credential.user.uid).set({
    uid: credential.user.uid,
    email,
    displayName,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  dispatch(setUser({ uid: credential.user.uid, email, displayName }));
}

export async function logout(dispatch: AppDispatch): Promise<void> {
  await auth().signOut();
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  dispatch(clearUser());
}

export async function restoreSession(dispatch: AppDispatch): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return false;

    const currentUser = auth().currentUser;
    if (currentUser) {
      // Refresh token to keep it valid
      const freshToken = await currentUser.getIdToken(true);
      await SecureStore.setItemAsync(TOKEN_KEY, freshToken);
      dispatch(setUser({
        uid: currentUser.uid,
        email: currentUser.email ?? '',
        displayName: currentUser.displayName,
      }));
      return true;
    }
    // Token exists but no current user — wait for auth state
    return false;
  } catch {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return false;
  }
}
