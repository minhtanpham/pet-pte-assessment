import { memo, useCallback } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import type { Message } from "@/store/slices/chat-slice";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";

interface Props {
  title: string;
  messages: Message[];
  currentUid: string | null;
  onSend: (text: string) => void;
  headerRight?: () => React.ReactNode;
  isOffline?: boolean;
}

const ITEM_HEIGHT = 64;

export const ChatView = memo(function ChatView({
  title,
  messages,
  currentUid,
  onSend,
  headerRight,
  isOffline,
}: Props) {
  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isOwn={item.senderId === currentUid} />
    ),
    [currentUid],
  );

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
      <Stack.Screen options={{ title, headerRight }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              You are offline. Messages will be sent when reconnected.
            </Text>
          </View>
        )}
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
        <ChatInput onSend={onSend} />
      </KeyboardAvoidingView>
    </>
  );
});

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
});
