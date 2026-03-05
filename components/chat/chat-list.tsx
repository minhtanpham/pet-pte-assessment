import { memo, useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Conversation } from '@/store/slices/chat-slice';

interface Props {
  conversations: Conversation[];
  currentUid: string;
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUid: string;
  userName: string;
}

const ITEM_HEIGHT = 72;

const ConversationItem = memo(function ConversationItem({ conversation, currentUid, userName }: ConversationItemProps) {
  const formattedTime = conversation.updatedAt
    ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
        new Date(conversation.updatedAt),
      )
    : '';

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/chat/${conversation.id}`)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={styles.time}>{formattedTime}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {conversation.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export const ChatList = memo(function ChatList({ conversations, currentUid }: Props) {
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const otherUids = [
      ...new Set(
        conversations
          .flatMap((c) => c.participants)
          .filter((p) => p !== currentUid),
      ),
    ];
    if (otherUids.length === 0) return;

    supabase
      .from('users')
      .select('id, display_name, email')
      .in('id', otherUids)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((u) => { map[u.id] = u.display_name || u.email || u.id; });
        setUserNames(map);
      });
  }, [conversations, currentUid]);

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => {
      const otherUid = item.participants.find((p) => p !== currentUid) ?? '';
      return (
        <ConversationItem
          conversation={item}
          currentUid={currentUid}
          userName={userNames[otherUid] || otherUid}
        />
      );
    },
    [currentUid, userNames],
  );

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    [],
  );

  return (
    <FlatList
      data={conversations}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      maxToRenderPerBatch={15}
      windowSize={10}
      contentContainerStyle={conversations.length === 0 && styles.emptyContainer}
      ListEmptyComponent={
        <View style={styles.emptyContent}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start a new chat to get going</Text>
        </View>
      }
    />
  );
});

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: ITEM_HEIGHT,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '600', color: '#11181C', flex: 1 },
  time: { fontSize: 12, color: '#9BA1A6', marginLeft: 8 },
  lastMessage: { fontSize: 13, color: '#687076' },
  emptyContainer: { flex: 1 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#11181C', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#687076' },
});
