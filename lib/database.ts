import { supabase } from './supabase';
import { Query } from '@/constants';
import { setMessages, addMessage, updateMessageStatus, addPendingMessage, setConversations } from '@/store/slices/chat-slice';
import type { AppDispatch } from '@/store';
import type { Message } from '@/store/slices/chat-slice';

// --- Message helpers ---

export function subscribeToMessages(conversationId: string, dispatch: AppDispatch) {
  // Fetch existing messages first
  supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(Query.messageLimit)
    .then(({ data }) => {
      if (!data) return;
      const msgs: Message[] = data.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        text: row.text as string,
        createdAt: new Date(row.created_at).getTime(),
        status: row.status ?? 'sent',
        conversationId,
      }));
      dispatch(setMessages({ conversationId, messages: msgs }));
    });

  // Subscribe to new messages in real-time
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const row = payload.new as any;
        dispatch(addMessage({
          id: row.id,
          senderId: row.sender_id,
          text: row.text as string,
          createdAt: new Date(row.created_at).getTime(),
          status: row.status ?? 'sent',
          conversationId,
        }));
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages' },
      (payload) => {
        const row = payload.new as any;
        if (row.conversation_id !== conversationId) return;
        dispatch(updateMessageStatus({
          conversationId,
          messageId: row.id,
          status: row.status,
        }));
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    text,
    encrypted: false,
    status: 'sent',
  });

  await supabase
    .from('conversations')
    .update({ last_message: text, updated_at: new Date().toISOString() })
    .eq('id', conversationId);
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
      id: `pending_${Date.now()}`,
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
  const { error, data } = await supabase
    .from('messages')
    .update({ status: 'seen' })
    .eq('conversation_id', conversationId)
    .eq('status', 'sent')
    .neq('sender_id', viewerUid)
    .select('id');
  if (error) console.error('[markAsSeen] error:', error.code, error.message);
  else console.log('[markAsSeen] updated', data?.length ?? 0, 'messages to seen');
}

// --- Conversation helpers ---

export function subscribeToConversations(uid: string, dispatch: AppDispatch) {
  supabase
    .from('conversations')
    .select('*')
    .contains('participants', [uid])
    .order('updated_at', { ascending: false })
    .then(({ data }) => {
      if (data) dispatch(setConversations(data.map((c) => ({
        id: c.id,
        participants: c.participants,
        lastMessage: c.last_message,
        updatedAt: new Date(c.updated_at).getTime(),
      }))));
    });

  const channel = supabase
    .channel(`conversations:${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      () => {
        supabase
          .from('conversations')
          .select('*')
          .contains('participants', [uid])
          .order('updated_at', { ascending: false })
          .then(({ data }) => {
            if (data) dispatch(setConversations(data.map((c) => ({
              id: c.id,
              participants: c.participants,
              lastMessage: c.last_message,
              updatedAt: new Date(c.updated_at).getTime(),
            }))));
          });
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export async function createConversation(uid1: string, uid2: string): Promise<string> {
  const id = [uid1, uid2].sort().join('_');
  await supabase.from('conversations').upsert({
    id,
    participants: [uid1, uid2],
    last_message: '',
    updated_at: new Date().toISOString(),
  });
  return id;
}

// --- User search ---

export async function searchUsers(query: string, currentUid: string) {
  const { data } = await supabase
    .from('users')
    .select('id, email, display_name')
    .ilike('display_name', `%${query}%`)
    .neq('id', currentUid)
    .limit(Query.userSearchLimit);
  return (data ?? []).map((u) => ({ uid: u.id, email: u.email, displayName: u.display_name }));
}

// --- Group helpers ---

export async function createGroup(name: string, participants: string[]): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('groups')
    .insert({ name, participants, created_by: user.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export function subscribeToGroupMessages(groupId: string, dispatch: AppDispatch) {
  supabase
    .from('group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(Query.messageLimit)
    .then(({ data }) => {
      if (!data) return;
      const msgs: Message[] = data.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        text: row.text,
        createdAt: new Date(row.created_at).getTime(),
        status: 'sent',
        conversationId: groupId,
      }));
      dispatch(setMessages({ conversationId: groupId, messages: msgs }));
    });

  const channel = supabase
    .channel(`group_messages:${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
      (payload) => {
        const row = payload.new as any;
        dispatch(addMessage({
          id: row.id,
          senderId: row.sender_id,
          text: row.text,
          createdAt: new Date(row.created_at).getTime(),
          status: row.status ?? 'sent',
          conversationId: groupId,
        }));
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export async function sendGroupMessage(groupId: string, senderId: string, text: string): Promise<void> {
  await supabase.from('group_messages').insert({
    group_id: groupId,
    sender_id: senderId,
    text,
    status: 'sent',
  });
  await supabase
    .from('groups')
    .update({ last_message: text, updated_at: new Date().toISOString() })
    .eq('id', groupId);
}
