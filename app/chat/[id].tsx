import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import {
  markAsSeen,
  sendMessageOrQueue,
  subscribeToMessages,
} from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { AppDispatch, RootState } from "@/store";
import type { Message } from "@/store/slices/chat-slice";
import {
  removePendingMessage,
  selectMessages,
  selectPendingMessages,
} from "@/store/slices/chat-slice";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const isConnected = useSelector(
    (state: RootState) => state.network.isConnected,
  );
  const messages = useSelector((state: RootState) =>
    selectMessages(state, conversationId),
  );
  const pendingMessages = useSelector((state: RootState) =>
    selectPendingMessages(state, conversationId),
  );
  const [otherUserName, setOtherUserName] = useState("Chat");

  useEffect(() => {
    if (!conversationId || !uid) return;
    supabase
      .from("conversations")
      .select("participants")
      .eq("id", conversationId)
      .single()
      .then(async ({ data }) => {
        if (!data) return;
        const otherId = (data.participants as string[]).find((p) => p !== uid);
        if (!otherId) return;
        const { data: user } = await supabase
          .from("users")
          .select("display_name, email")
          .eq("id", otherId)
          .single();
        if (user) setOtherUserName(user.display_name || user.email || "Chat");
      });
  }, [conversationId, uid]);

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
          await sendMessageOrQueue(
            conversationId,
            uid,
            msg.text,
            dispatch,
            true,
          );
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
    ...pendingMessages.map((m) => ({ ...m, status: "pending" as const })),
    ...messages,
  ];

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isOwn={item.senderId === uid} />
    ),
    [uid],
  );

  const ITEM_HEIGHT = 64;
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: otherUserName,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/call/${conversationId}`)}
              style={styles.callButton}
            >
              <Text style={styles.callButtonText}>Video Call</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              You are offline. Messages will be sent when reconnected.
            </Text>
          </View>
        )}
        <FlatList
          data={allMessages}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  listContent: { paddingHorizontal: 16, paddingVertical: 8 },
  offlineBanner: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  offlineText: { color: "#92400E", fontSize: 13, textAlign: "center" },
  callButton: {
    backgroundColor: "#0a7ea4",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  callButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
