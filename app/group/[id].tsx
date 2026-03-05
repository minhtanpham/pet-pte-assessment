import { useCallback, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { selectMessages } from '@/store/slices/chat-slice';
import { subscribeToGroupMessages, sendGroupMessage } from '@/lib/database';
import { FlatList } from 'react-native';
import { MessageBubble } from '@/components/chat/message-bubble';
import { ChatInput } from '@/components/chat/chat-input';
import type { Message } from '@/store/slices/chat-slice';
import { GroupHeader } from '@/components/chat/group-header';

export default function GroupChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const messages = useSelector((state: RootState) => selectMessages(state, groupId));

  useEffect(() => {
    if (!groupId) return;
    const unsubscribe = subscribeToGroupMessages(groupId, dispatch);
    return unsubscribe;
  }, [groupId, dispatch]);

  const handleSend = useCallback(
    (text: string) => {
      if (!uid) return;
      sendGroupMessage(groupId, uid, text);
    },
    [uid, groupId],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isOwn={item.senderId === uid} />
    ),
    [uid],
  );

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
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        inverted
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={10}
        contentContainerStyle={styles.listContent}
      />
      <ChatInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  listContent: { paddingHorizontal: 16, paddingVertical: 8 },
});
