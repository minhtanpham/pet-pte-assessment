import { ChatList } from "@/components/chat";
import { BorderRadius, FontSize, Palette } from "@/constants";
import { useNetwork } from "@/hooks";
import { logout } from "@/lib/auth";
import { subscribeToConversations } from "@/lib/database";
import type { AppDispatch, RootState } from "@/store";
import { selectConversationList } from "@/store/slices/chat-slice";
import { useCallback, useEffect } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

export default function ChatsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid) ?? "";
  const displayName = useSelector((state: RootState) => state.auth.displayName);
  const conversations = useSelector(selectConversationList);
  useNetwork();

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToConversations(uid, dispatch);
    return unsubscribe;
  }, [uid, dispatch]);

  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => logout(dispatch),
      },
    ]);
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          {displayName && <Text style={styles.subtitle}>{displayName}</Text>}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ChatList conversations={conversations} currentUid={uid} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.grey300,
  },
  title: { fontSize: FontSize.title, fontWeight: "700", color: Palette.black },
  subtitle: { fontSize: FontSize.sm, color: Palette.grey600, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xl,
    backgroundColor: Palette.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonText: {
    color: Palette.white,
    fontSize: FontSize.xxl,
    lineHeight: 28,
  },
  logoutButton: { paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: {
    color: Palette.danger,
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
});
