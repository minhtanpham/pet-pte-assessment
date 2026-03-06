import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { selectMessages, selectPendingMessages } from '@/store/slices/chat-slice';
import { sendMessageOrQueue } from '@/lib/database';
import type { Message } from '@/store/slices/chat-slice';

export function useMessages(conversationId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const isConnected = useSelector((state: RootState) => state.network.isConnected);
  const messages = useSelector((state: RootState) => selectMessages(state, conversationId));
  const pendingMessages = useSelector((state: RootState) =>
    selectPendingMessages(state, conversationId),
  );

  const allMessages = useMemo<Message[]>(
    () => [
      ...pendingMessages.map((m) => ({ ...m, status: 'pending' as const })),
      ...messages,
    ],
    [messages, pendingMessages],
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!uid) return;
      sendMessageOrQueue(conversationId, uid, text, dispatch, isConnected);
    },
    [uid, conversationId, dispatch, isConnected],
  );

  return { messages: allMessages, sendMessage, uid };
}
