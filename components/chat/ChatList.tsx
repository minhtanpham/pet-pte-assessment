import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Chat, FontSize, Palette, Spacing } from '@/constants';
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

function areItemsEqual(prev: ConversationItemProps, next: ConversationItemProps) {
  return (
    prev.conversation.id === next.conversation.id &&
    prev.conversation.lastMessage === next.conversation.lastMessage &&
    prev.conversation.updatedAt === next.conversation.updatedAt &&
    prev.userName === next.userName
  );
}

const ConversationItem = memo(function ConversationItem({ conversation, userName }: ConversationItemProps) {
  const formattedTime = useMemo(
    () =>
      conversation.updatedAt
        ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
            new Date(conversation.updatedAt),
          )
        : '',
    [conversation.updatedAt],
  );

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/chat/${conversation.id}`)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{userName}</Text>
          <Text style={styles.time}>{formattedTime}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {conversation.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}, areItemsEqual);

export const ChatList = memo(function ChatList({ conversations, currentUid }: Props) {
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const fetchedUidsRef = useRef(new Set<string>());

  // Only re-fetch when the set of participant UIDs actually changes
  const participantUidKey = useMemo(
    () =>
      [...new Set(conversations.flatMap((c) => c.participants).filter((p) => p !== currentUid))]
        .sort()
        .join(','),
    [conversations, currentUid],
  );

  useEffect(() => {
    const allOtherUids = participantUidKey ? participantUidKey.split(',') : [];
    const newUids = allOtherUids.filter((uid) => !fetchedUidsRef.current.has(uid));
    if (newUids.length === 0) return;

    newUids.forEach((uid) => fetchedUidsRef.current.add(uid));

    supabase
      .from('users')
      .select('id, display_name, email')
      .in('id', newUids)
      .then(({ data }) => {
        if (!data) return;
        setUserNames((prev) => {
          const next = { ...prev };
          data.forEach((u) => { next[u.id] = u.display_name || u.email || u.id; });
          return next;
        });
      });
  }, [participantUidKey]);

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
    (_: any, index: number) => ({
      length: Chat.conversationItemHeight,
      offset: Chat.conversationItemHeight * index,
      index,
    }),
    [],
  );

  return (
    <FlatList
      data={conversations}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      maxToRenderPerBatch={Chat.maxToRenderPerBatch}
      windowSize={Chat.windowSize}
      initialNumToRender={Chat.initialNumToRender}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    height: Chat.conversationItemHeight,
    backgroundColor: Palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.grey300,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { color: Palette.white, fontSize: FontSize.xl, fontWeight: '600' },
  content: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Palette.black, flex: 1 },
  time: { fontSize: FontSize.xs, color: Palette.grey500, marginLeft: Spacing.sm },
  lastMessage: { fontSize: FontSize.sm, color: Palette.grey600 },
  emptyContainer: { flex: 1 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.xl, fontWeight: '600', color: Palette.black, marginBottom: Spacing.sm },
  emptySubtext: { fontSize: FontSize.sm, color: Palette.grey600 },
});
