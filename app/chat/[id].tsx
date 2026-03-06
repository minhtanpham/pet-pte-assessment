import { BorderRadius, Palette } from "@/constants";
import { ChatView } from "@/components/chat";
import {
  markAsSeen,
  sendMessageOrQueue,
  subscribeToMessages,
} from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { AppDispatch, RootState } from "@/store";
import {
  removePendingMessage,
  selectMessages,
  selectPendingMessages,
} from "@/store/slices/chat-slice";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
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
    return subscribeToMessages(conversationId, dispatch);
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (!conversationId || !uid) return;
    markAsSeen(conversationId, uid);
  }, [conversationId, uid, messages.length]);

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

  const allMessages = useMemo(
    () => [
      ...pendingMessages.map((m) => ({ ...m, status: "pending" as const })),
      ...messages,
    ],
    [pendingMessages, messages],
  );

  const headerRight = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => router.push(`/call/${conversationId}`)}
        style={styles.callButton}
      >
        <Text style={styles.callButtonText}>Video Call</Text>
      </TouchableOpacity>
    ),
    [conversationId],
  );

  return (
    <ChatView
      title={otherUserName}
      messages={allMessages}
      currentUid={uid}
      onSend={handleSend}
      headerRight={headerRight}
      isOffline={!isConnected}
    />
  );
}

const styles = StyleSheet.create({
  callButton: {
    backgroundColor: Palette.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  callButtonText: { color: Palette.white, fontSize: 13, fontWeight: "600" },
});
