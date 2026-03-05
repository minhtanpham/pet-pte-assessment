import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  status: 'sent' | 'seen' | 'pending';
  conversationId: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  updatedAt: number;
}

interface ChatState {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  pendingMessages: Message[];
}

const initialState: ChatState = {
  conversations: {},
  messages: {},
  pendingMessages: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<Conversation[]>) {
      const map: Record<string, Conversation> = {};
      action.payload.forEach((c) => { map[c.id] = c; });
      state.conversations = map;
    },
    setMessages(state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage(state, action: PayloadAction<Message>) {
      const { conversationId } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      const exists = state.messages[conversationId].some((m) => m.id === action.payload.id);
      if (!exists) {
        state.messages[conversationId].unshift(action.payload);
      }
    },
    updateMessageStatus(state, action: PayloadAction<{ conversationId: string; messageId: string; status: 'sent' | 'seen' }>) {
      const msgs = state.messages[action.payload.conversationId];
      if (msgs) {
        const msg = msgs.find((m) => m.id === action.payload.messageId);
        if (msg) msg.status = action.payload.status;
      }
    },
    addPendingMessage(state, action: PayloadAction<Message>) {
      state.pendingMessages.push(action.payload);
    },
    removePendingMessage(state, action: PayloadAction<string>) {
      state.pendingMessages = state.pendingMessages.filter((m) => m.id !== action.payload);
    },
    clearPendingMessages(state) {
      state.pendingMessages = [];
    },
  },
});

export const {
  setConversations,
  setMessages,
  addMessage,
  updateMessageStatus,
  addPendingMessage,
  removePendingMessage,
  clearPendingMessages,
} = chatSlice.actions;

// Memoized selectors
export const selectMessages = createSelector(
  (state: RootState) => state.chat.messages,
  (_: RootState, conversationId: string) => conversationId,
  (messages, conversationId) => messages[conversationId] ?? [],
);

export const selectConversationList = createSelector(
  (state: RootState) => state.chat.conversations,
  (conversations) => Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt),
);

export const selectPendingMessages = createSelector(
  (state: RootState) => state.chat.pendingMessages,
  (_: RootState, conversationId: string) => conversationId,
  (pending, conversationId) => pending.filter((m) => m.conversationId === conversationId),
);

export default chatSlice.reducer;
