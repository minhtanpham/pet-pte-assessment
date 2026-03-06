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
import { Chat, Palette, Spacing } from "@/constants";
import type { Message } from "@/store/slices/chat-slice";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface Props {
  title: string;
  messages: Message[];
  currentUid: string | null;
  onSend: (text: string) => void;
  headerRight?: () => React.ReactNode;
  isOffline?: boolean;
}

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
      length: Chat.messageItemHeight,
      offset: Chat.messageItemHeight * index,
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
        keyboardVerticalOffset={Chat.keyboardVerticalOffset}
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
          maxToRenderPerBatch={Chat.maxToRenderPerBatch}
          windowSize={Chat.windowSize}
          initialNumToRender={Chat.initialNumToRender}
          contentContainerStyle={styles.listContent}
        />
        <ChatInput onSend={onSend} />
      </KeyboardAvoidingView>
    </>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.grey100 },
  listContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  offlineBanner: {
    backgroundColor: Palette.warning,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warningBorder,
  },
  offlineText: { color: Palette.warningText, fontSize: 13, textAlign: "center" },
});
