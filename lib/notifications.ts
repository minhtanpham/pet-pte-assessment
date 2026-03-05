import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(uid: string): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Get FCM token via @react-native-firebase/messaging
  const fcmToken = await messaging().getToken();
  if (fcmToken) {
    await firestore().collection('users').doc(uid).set({ fcmToken }, { merge: true });
  }

  // Handle foreground messages
  messaging().onMessage(async (remoteMessage) => {
    const { notification } = remoteMessage;
    if (!notification) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title ?? 'New Message',
        body: notification.body ?? '',
        data: remoteMessage.data ?? {},
      },
      trigger: null,
    });
  });
}
