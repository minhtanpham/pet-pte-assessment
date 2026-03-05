import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import type { RootState, AppDispatch } from '@/store';
import { setConversations } from '@/store/slices/chat-slice';
import { createGroup } from '@/lib/firestore';

interface Group {
  id: string;
  name: string;
  participants: string[];
  createdBy: string;
  updatedAt?: number;
  lastMessage?: string;
}

export default function GroupsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid) ?? '';
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [participantUids, setParticipantUids] = useState('');

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = firestore()
      .collection('groups')
      .where('participants', 'array-contains', uid)
      .orderBy('updatedAt', 'desc')
      .onSnapshot((snap) => {
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          updatedAt: doc.data().updatedAt?.toMillis() ?? 0,
        })) as Group[];
        setGroups(data);
      });
    return unsubscribe;
  }, [uid]);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    const extra = participantUids.split(',').map((s) => s.trim()).filter(Boolean);
    const participants = Array.from(new Set([uid, ...extra]));
    try {
      await createGroup(groupName.trim(), participants, uid);
      setShowCreate(false);
      setGroupName('');
      setParticipantUids('');
    } catch (err) {
      Alert.alert('Error', 'Failed to create group');
    }
  }, [groupName, participantUids, uid]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => setShowCreate(true)}>
          <Text style={styles.iconButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push(`/group/${item.id}`)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.participants.length} members</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>Create a group to get started</Text>
          </View>
        }
      />

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Group</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Group name"
              placeholderTextColor="#9BA1A6"
              value={groupName}
              onChangeText={setGroupName}
            />
            <TextInput
              style={styles.input}
              placeholder="Participant UIDs (comma-separated)"
              placeholderTextColor="#9BA1A6"
              value={participantUids}
              onChangeText={setParticipantUids}
              multiline
            />
            <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
              <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#11181C' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: { color: '#fff', fontSize: 22, lineHeight: 28 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#11181C' },
  meta: { fontSize: 13, color: '#687076', marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#11181C', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#687076' },
  modal: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  modalClose: { color: '#0a7ea4', fontSize: 16 },
  form: { padding: 16, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#11181C',
    backgroundColor: '#F9FAFB',
  },
  createButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
