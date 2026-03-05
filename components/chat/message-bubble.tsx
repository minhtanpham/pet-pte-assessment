import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Message } from '@/store/slices/chat-slice';

interface Props {
  message: Message;
  isOwn: boolean;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
}

function areEqual(prev: Props, next: Props): boolean {
  return (
    prev.message.id === next.message.id &&
    prev.message.status === next.message.status &&
    prev.isOwn === next.isOwn
  );
}

export const MessageBubble = memo(function MessageBubble({ message, isOwn }: Props) {
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
          {message.text}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
            {formatTime(message.createdAt)}
          </Text>
          {isOwn && (
            <Text style={styles.status}>
              {message.status === 'seen' ? '✓✓' : message.status === 'pending' ? '⏳' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}, areEqual);

const styles = StyleSheet.create({
  row: { marginVertical: 3, paddingHorizontal: 4 },
  rowOwn: { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: '#0a7ea4',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15, lineHeight: 20 },
  textOwn: { color: '#fff' },
  textOther: { color: '#11181C' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  time: { fontSize: 11 },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  timeOther: { color: '#9BA1A6' },
  status: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
});
