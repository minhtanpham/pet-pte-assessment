import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { sendGroupMessage, subscribeToGroupMessages } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { AppDispatch, RootState } from "@/store";
import type { Message } from "@/store/slices/chat-slice";
import { selectMessages } from "@/store/slices/chat-slice";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

export default function GroupChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const messages = useSelector((state: RootState) =>
    selectMessages(state, groupId),
  );
  const [groupName, setGroupName] = useState("Group");

  useEffect(() => {
    supabase
      .from("groups")
      .select("name")
      .eq("id", groupId)
      .single()
      .then(({ data }) => {
        if (data?.name) setGroupName(data.name);
      });
  }, [groupId]);

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
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <>
      <Stack.Screen options={{ title: groupName }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  listContent: { paddingHorizontal: 16, paddingVertical: 8 },
});
