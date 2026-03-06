import { BorderRadius, FontSize, Palette, Spacing } from '@/constants';
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { selectConversationList } from '@/store/slices/chat-slice';
import { subscribeToConversations, searchUsers, createConversation } from '@/lib/database';
import { ChatList } from '@/components/chat';
import { logout } from '@/lib/auth';
import { useNetwork } from '@/hooks';

export default function ChatsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid) ?? '';
  const displayName = useSelector((state: RootState) => state.auth.displayName);
  const conversations = useSelector(selectConversationList);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  useNetwork();

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToConversations(uid, dispatch);
    return unsubscribe;
  }, [uid, dispatch]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim(), uid);
      setSearchResults(results);
    } catch (err) {
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, uid]);

  const handleStartChat = useCallback(
    async (targetUid: string) => {
      try {
        const conversationId = await createConversation(uid, targetUid);
        setShowNewChat(false);
        setSearchQuery('');
        setSearchResults([]);
      } catch (err) {
        Alert.alert('Error', 'Failed to create conversation');
      }
    },
    [uid],
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout(dispatch) },
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
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowNewChat(true)}>
            <Text style={styles.iconButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ChatList conversations={conversations} currentUid={uid} />

      <Modal visible={showNewChat} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Chat</Text>
            <TouchableOpacity onPress={() => { setShowNewChat(false); setSearchResults([]); setSearchQuery(''); }}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by display name..."
              placeholderTextColor={Palette.grey500}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              {searching ? (
                <ActivityIndicator size="small" color={Palette.white} />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
          {searchResults.map((user) => (
            <TouchableOpacity
              key={user.uid}
              style={styles.userItem}
              onPress={() => handleStartChat(user.uid)}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{user.displayName?.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.userName}>{user.displayName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.grey300,
  },
  title: { fontSize: FontSize.title, fontWeight: '700', color: Palette.black },
  subtitle: { fontSize: FontSize.sm, color: Palette.grey600, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xl,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: { color: Palette.white, fontSize: FontSize.xxl, lineHeight: 28 },
  logoutButton: { paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: Palette.danger, fontSize: FontSize.sm, fontWeight: '500' },
  modal: { flex: 1, backgroundColor: Palette.white, paddingTop: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.grey300,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Palette.black },
  modalClose: { color: Palette.primary, fontSize: FontSize.lg },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.grey300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Palette.black,
    backgroundColor: Palette.grey100,
  },
  searchButton: {
    backgroundColor: Palette.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchButtonText: { color: Palette.white, fontWeight: '600' },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.grey300,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.round,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: { color: Palette.white, fontSize: FontSize.lg, fontWeight: '600' },
  userName: { fontSize: FontSize.md, fontWeight: '600', color: Palette.black },
  userEmail: { fontSize: FontSize.sm, color: Palette.grey600 },
});
