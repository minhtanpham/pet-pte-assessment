import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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
  if (!Device.isDevice) return;

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

  const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
  if (pushToken) {
    await supabase.from('users').update({ push_token: pushToken }).eq('id', uid);
  }
}

export async function sendPushNotification({
  to,
  title,
  body,
  data,
}: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!to || !to.startsWith('ExponentPushToken')) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      title,
      body,
      data,
      sound: 'default',
      channelId: 'messages',
    }),
  }).catch(() => {});
}

export async function notifyMessageRecipients(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<void> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('participants')
    .eq('id', conversationId)
    .single();
  if (!conv) return;

  const recipientIds = (conv.participants as string[]).filter((id) => id !== senderId);
  if (recipientIds.length === 0) return;

  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, email, push_token')
    .in('id', [...recipientIds, senderId]);
  if (!users) return;

  const sender = users.find((u) => u.id === senderId);
  const senderName = sender?.display_name || sender?.email || 'Someone';

  await Promise.all(
    users
      .filter((u) => recipientIds.includes(u.id) && u.push_token)
      .map((u) =>
        sendPushNotification({
          to: u.push_token,
          title: senderName,
          body: text,
          data: { type: 'message', conversationId },
        }),
      ),
  );
}

export async function notifyGroupMessageRecipients(
  groupId: string,
  senderId: string,
  text: string,
): Promise<void> {
  const { data: group } = await supabase
    .from('groups')
    .select('name, participants')
    .eq('id', groupId)
    .single();
  if (!group) return;

  const recipientIds = (group.participants as string[]).filter((id) => id !== senderId);
  if (recipientIds.length === 0) return;

  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, email, push_token')
    .in('id', [...recipientIds, senderId]);
  if (!users) return;

  const sender = users.find((u) => u.id === senderId);
  const senderName = sender?.display_name || sender?.email || 'Someone';

  await Promise.all(
    users
      .filter((u) => recipientIds.includes(u.id) && u.push_token)
      .map((u) =>
        sendPushNotification({
          to: u.push_token,
          title: group.name,
          body: `${senderName}: ${text}`,
          data: { type: 'group_message', groupId },
        }),
      ),
  );
}
