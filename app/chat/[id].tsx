import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { selectMessages, selectPendingMessages, addPendingMessage, removePendingMessage } from '@/store/slices/chat-slice';
import { subscribeToMessages, markAsSeen } from '@/lib/database';
import { sendMessageOrQueue } from '@/lib/database';
import { MessageBubble } from '@/components/chat/message-bubble';
import { ChatInput } from '@/components/chat/chat-input';
import type { Message } from '@/store/slices/chat-slice';

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const isConnected = useSelector((state: RootState) => state.network.isConnected);
  const messages = useSelector((state: RootState) => selectMessages(state, conversationId));
  const pendingMessages = useSelector((state: RootState) => selectPendingMessages(state, conversationId));
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = subscribeToMessages(conversationId, dispatch);
    return unsubscribe;
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (!conversationId || !uid) return;
    markAsSeen(conversationId, uid);
  }, [conversationId, uid, messages.length]);

  // Flush pending messages when reconnected
  useEffect(() => {
    if (!isConnected || !uid || pendingMessages.length === 0) return;
    const flush = async () => {
      for (const msg of pendingMessages) {
        try {
          await sendMessageOrQueue(conversationId, uid, msg.text, dispatch, true);
          dispatch(removePendingMessage(msg.id));
        } catch {}
      }
    };
    flush();
  }, [isConnected]);

  const handleSend = useCallback(
    (text: string) => {
      if (!uid) return;
      sendMessageOrQueue(conversationId, uid, text, dispatch, isConnected);
    },
    [uid, conversationId, dispatch, isConnected],
  );

  const allMessages = [
    ...pendingMessages.map((m) => ({ ...m, status: 'pending' as const })),
    ...messages,
  ];

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isOwn={item.senderId === uid} />
    ),
    [uid],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const ITEM_HEIGHT = 64;
  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    [],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are offline. Messages will be sent when reconnected.</Text>
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        inverted
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={10}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity
        style={styles.callButton}
        onPress={() => router.push(`/call/${conversationId}`)}>
        <Text style={styles.callButtonText}>Video Call</Text>
      </TouchableOpacity>
      <ChatInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  listContent: { paddingHorizontal: 16, paddingVertical: 8 },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineText: { color: '#92400E', fontSize: 13, textAlign: 'center' },
  callButton: {
    position: 'absolute',
    top: 8,
    right: 16,
    backgroundColor: '#0a7ea4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  callButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
