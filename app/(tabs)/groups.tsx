import { BorderRadius, FontSize, Palette, Spacing } from "@/constants";
import { createGroup } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { AppDispatch, RootState } from "@/store";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CreateNewGroupModal } from "@/components/modals";
import { useDispatch, useSelector } from "react-redux";

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
  const uid = useSelector((state: RootState) => state.auth.uid) ?? "";
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [participantUids, setParticipantUids] = useState("");

  useEffect(() => {
    if (!uid) return;

    const fetchGroups = () => {
      supabase
        .from("groups")
        .select("*")
        .contains("participants", [uid])
        .order("updated_at", { ascending: false })
        .then(({ data }) => {
          if (data)
            setGroups(
              data.map((g) => ({
                id: g.id,
                name: g.name,
                participants: g.participants,
                createdBy: g.created_by,
                updatedAt: new Date(g.updated_at).getTime(),
                lastMessage: g.last_message,
              })),
            );
        });
    };

    fetchGroups();

    const channel = supabase
      .channel(`groups:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        fetchGroups,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }
    const extra = participantUids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const participants = Array.from(new Set([uid, ...extra]));
    try {
      await createGroup(groupName.trim(), participants);
      setShowCreate(false);
      setGroupName("");
      setParticipantUids("");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create group");
    }
  }, [groupName, participantUids, uid]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowCreate(true)}
        >
          <Text style={styles.iconButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push(`/group/${item.id}`)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.participants.length} members
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>
              Create a group to get started
            </Text>
          </View>
        }
      />

      <CreateNewGroupModal
        visible={showCreate}
        groupName={groupName}
        participantUids={participantUids}
        onChangeGroupName={setGroupName}
        onChangeParticipantUids={setParticipantUids}
        onCreate={handleCreate}
        onClose={() => setShowCreate(false)}
      />
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xl,
    backgroundColor: Palette.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonText: { color: Palette.white, fontSize: FontSize.xxl, lineHeight: 28 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.grey300,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.round,
    backgroundColor: Palette.purple,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: Palette.white, fontSize: FontSize.xl, fontWeight: "600" },
  content: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: "600", color: Palette.black },
  meta: { fontSize: FontSize.sm, color: Palette.grey600, marginTop: 2 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: FontSize.xl,
    fontWeight: "600",
    color: Palette.black,
    marginBottom: 8,
  },
  emptySubtext: { fontSize: FontSize.sm, color: Palette.grey600 },
});
