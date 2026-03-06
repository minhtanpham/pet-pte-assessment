import { ChatList } from "@/components/chat";
import { SearchDisplayNameModal, type SearchResultUser } from "@/components/modals/SearchDisplayNameModal";
import { LoadingOverlay, ScreenContainer } from "@/components/ui";
import { BorderRadius, FontSize, Layout, Palette } from "@/constants";
import { useNetwork } from "@/hooks";
import { logout } from "@/lib/auth";
import { createConversation, searchUsers, subscribeToConversations } from "@/lib/database";
import type { AppDispatch, RootState } from "@/store";
import { selectConversationList } from "@/store/slices/chat-slice";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";

export default function ChatsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const uid = useSelector((state: RootState) => state.auth.uid) ?? "";
  const displayName = useSelector((state: RootState) => state.auth.displayName);
  const conversations = useSelector(selectConversationList);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  useNetwork();

  useEffect(() => {
    if (!uid) return;
    return subscribeToConversations(uid, dispatch, () => setIsLoading(false));
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

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim(), uid);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, uid]);

  const handleSelectUser = useCallback(async (targetUid: string) => {
    setModalVisible(false);
    setSearchQuery("");
    setSearchResults([]);
    const conversationId = await createConversation(uid, targetUid);
    router.push(`/chat/${conversationId}`);
  }, [uid, router]);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  return (
    <ScreenContainer edges={['top']} backgroundColor={Palette.white}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          {displayName && <Text style={styles.subtitle}>{displayName}</Text>}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.iconButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? <LoadingOverlay /> : <ChatList conversations={conversations} currentUid={uid} />}

      <SearchDisplayNameModal
        visible={modalVisible}
        searching={searching}
        searchQuery={searchQuery}
        results={searchResults}
        onChangeSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        onSelectUser={handleSelectUser}
        onClose={handleCloseModal}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Layout.headerTopPadding,
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
