import firestore from '@react-native-firebase/firestore';
import { nanoid } from 'nanoid/non-secure';
import { setMessages, addMessage, updateMessageStatus, addPendingMessage } from '@/store/slices/chat-slice';
import { encryptMessage, decryptMessage } from './encryption';
import type { AppDispatch } from '@/store';
import type { Message } from '@/store/slices/chat-slice';

// --- Message helpers ---

export function subscribeToMessages(conversationId: string, dispatch: AppDispatch) {
  return firestore()
    .collection('messages')
    .doc(conversationId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .onSnapshot((snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        let text = data.text as string;
        if (data.encrypted && data.nonce && data.senderPublicKey) {
          text = decryptMessage(data.text, data.nonce, data.senderPublicKey) ?? '[encrypted]';
        }
        return {
          id: doc.id,
          senderId: data.senderId,
          text,
          createdAt: data.createdAt?.toMillis() ?? Date.now(),
          status: data.status ?? 'sent',
          conversationId,
        };
      });
      dispatch(setMessages({ conversationId, messages: msgs }));
    });
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
  const { ciphertext, nonce, senderPublicKey } = encryptMessage(text);
  await firestore()
    .collection('messages')
    .doc(conversationId)
    .collection('messages')
    .add({
      senderId,
      text: ciphertext,
      nonce,
      senderPublicKey,
      encrypted: true,
      createdAt: firestore.FieldValue.serverTimestamp(),
      status: 'sent',
    });

  await firestore().collection('conversations').doc(conversationId).set(
    {
      lastMessage: text,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function sendMessageOrQueue(
  conversationId: string,
  senderId: string,
  text: string,
  dispatch: AppDispatch,
  isConnected: boolean,
): Promise<void> {
  if (!isConnected) {
    const pendingMsg: Message = {
      id: `pending_${nanoid()}`,
      senderId,
      text,
      createdAt: Date.now(),
      status: 'pending',
      conversationId,
    };
    dispatch(addPendingMessage(pendingMsg));
    return;
  }
  await sendMessage(conversationId, senderId, text);
}

export async function markAsSeen(conversationId: string, viewerUid: string): Promise<void> {
  const snapshot = await firestore()
    .collection('messages')
    .doc(conversationId)
    .collection('messages')
    .where('status', '==', 'sent')
    .get();

  const batch = firestore().batch();
  snapshot.docs.forEach((doc) => {
    if (doc.data().senderId !== viewerUid) {
      batch.update(doc.ref, { status: 'seen' });
    }
  });
  await batch.commit();
}

// --- Conversation helpers ---

export function subscribeToConversations(uid: string, dispatch: AppDispatch) {
  return firestore()
    .collection('conversations')
    .where('participants', 'array-contains', uid)
    .orderBy('updatedAt', 'desc')
    .onSnapshot((snapshot) => {
      const { setConversations } = require('@/store/slices/chat-slice');
      const convs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toMillis() ?? 0,
      }));
      dispatch(setConversations(convs));
    });
}

export async function createConversation(uid1: string, uid2: string): Promise<string> {
  const id = [uid1, uid2].sort().join('_');
  await firestore().collection('conversations').doc(id).set(
    {
      participants: [uid1, uid2],
      lastMessage: '',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

// --- User search ---

export async function searchUsers(query: string, currentUid: string) {
  const snapshot = await firestore()
    .collection('users')
    .where('displayName', '>=', query)
    .where('displayName', '<=', query + '\uf8ff')
    .limit(20)
    .get();
  return snapshot.docs
    .map((doc) => doc.data())
    .filter((u) => u.uid !== currentUid);
}

// --- Group helpers ---

export async function createGroup(name: string, participants: string[], createdBy: string): Promise<string> {
  const ref = await firestore().collection('groups').add({
    name,
    participants,
    createdBy,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToGroupMessages(groupId: string, dispatch: AppDispatch) {
  return firestore()
    .collection('groups')
    .doc(groupId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .onSnapshot((snapshot) => {
      const msgs: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        senderId: doc.data().senderId,
        text: doc.data().text,
        createdAt: doc.data().createdAt?.toMillis() ?? Date.now(),
        status: 'sent',
        conversationId: groupId,
      }));
      dispatch(setMessages({ conversationId: groupId, messages: msgs }));
    });
}

export async function sendGroupMessage(groupId: string, senderId: string, text: string): Promise<void> {
  await firestore()
    .collection('groups')
    .doc(groupId)
    .collection('messages')
    .add({
      senderId,
      text,
      createdAt: firestore.FieldValue.serverTimestamp(),
      status: 'sent',
    });
  await firestore().collection('groups').doc(groupId).update({
    lastMessage: text,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}
