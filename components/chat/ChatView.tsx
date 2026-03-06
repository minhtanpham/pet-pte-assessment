import { memo, useCallback } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Chat, Palette, Spacing } from "@/constants";
import { LoadingOverlay } from "@/components/ui";
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
  isLoading?: boolean;
}

export const ChatView = memo(function ChatView({
  title,
  messages,
  currentUid,
  onSend,
  headerRight,
  isOffline,
  isLoading,
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
        {isLoading ? (
          <LoadingOverlay />
        ) : (
          <>
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
            <SafeAreaView edges={['bottom']} style={styles.inputSafeArea}>
              <ChatInput onSend={onSend} />
            </SafeAreaView>
          </>
        )}
      </KeyboardAvoidingView>
    </>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.grey100 },
  inputSafeArea: { backgroundColor: Palette.white },
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
