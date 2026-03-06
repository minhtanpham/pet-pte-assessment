import { BorderRadius, FontSize, Palette } from "@/constants";
import { searchUsers } from "@/lib/database";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SheetModal } from "./SheetModal";

export interface SearchUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface CreateNewGroupModalProps {
  visible: boolean;
  groupName: string;
  selectedParticipantUids: string[];
  currentUid: string;
  onChangeGroupName: (value: string) => void;
  onChangeSelectedParticipants: (uids: string[]) => void;
  onCreate: () => void;
  onClose: () => void;
}

const DEBOUNCE_MS = 300;

export function CreateNewGroupModal({
  visible,
  groupName,
  selectedParticipantUids,
  currentUid,
  onChangeGroupName,
  onChangeSelectedParticipants,
  onCreate,
  onClose,
}: CreateNewGroupModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDisplayNames, setSelectedDisplayNames] = useState<
    Record<string, string>
  >({});

  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const users = await searchUsers(trimmed, currentUid);
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [currentUid],
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const t = setTimeout(() => runSearch(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  const addParticipant = useCallback(
    (user: SearchUser) => {
      if (selectedParticipantUids.includes(user.uid)) return;
      onChangeSelectedParticipants([...selectedParticipantUids, user.uid]);
      setSelectedDisplayNames((prev) => ({
        ...prev,
        [user.uid]: user.displayName ?? user.email ?? user.uid,
      }));
      setSearchQuery("");
      setSearchResults([]);
    },
    [selectedParticipantUids, onChangeSelectedParticipants],
  );

  const removeParticipant = useCallback(
    (uid: string) => {
      onChangeSelectedParticipants(selectedParticipantUids.filter((id) => id !== uid));
      setSelectedDisplayNames((prev) => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
    },
    [selectedParticipantUids, onChangeSelectedParticipants],
  );

  const selectedList = selectedParticipantUids.map((uid) => ({
    uid,
    displayName: selectedDisplayNames[uid] ?? uid,
  }));

  return (
    <SheetModal visible={visible} title="New Group" onClose={onClose}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Group name"
          placeholderTextColor={Palette.grey500}
          value={groupName}
          onChangeText={onChangeGroupName}
        />

        <Text style={styles.label}>Add participants</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by name..."
          placeholderTextColor={Palette.grey500}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {searching && (
          <View style={styles.searchingRow}>
            <ActivityIndicator size="small" color={Palette.primary} />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}

        {!searching && searchQuery.trim().length > 0 && (
          <View style={styles.resultsBox}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.uid}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              nestedScrollEnabled
              renderItem={({ item }) => {
                const added = selectedParticipantUids.includes(item.uid);
                return (
                  <TouchableOpacity
                    style={[
                      styles.resultRow,
                      added && styles.resultRowDisabled,
                    ]}
                    onPress={() => !added && addParticipant(item)}
                    disabled={added}
                  >
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.displayName || item.email || item.uid}
                    </Text>
                    {item.email && item.displayName && (
                      <Text style={styles.resultEmail} numberOfLines={1}>
                        {item.email}
                      </Text>
                    )}
                    {added && (
                      <Text style={styles.addedLabel}>Added</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyResults}>No users found</Text>
              }
            />
          </View>
        )}

        {selectedList.length > 0 && (
          <>
            <Text style={styles.label}>Selected</Text>
            <View style={styles.chips}>
              {selectedList.map(({ uid, displayName }) => (
                <View key={uid} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <TouchableOpacity
                    hitSlop={8}
                    onPress={() => removeParticipant(uid)}
                    style={styles.chipRemove}
                  >
                    <Text style={styles.chipRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.createButton,
            selectedParticipantUids.length === 0 && styles.createButtonDisabled,
          ]}
          onPress={onCreate}
          disabled={selectedParticipantUids.length === 0}
        >
          <Text style={styles.createButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: Palette.grey300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Palette.black,
    backgroundColor: Palette.grey100,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Palette.grey600,
    marginTop: 4,
  },
  searchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  searchingText: {
    fontSize: FontSize.sm,
    color: Palette.grey600,
  },
  resultsBox: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Palette.grey300,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.grey100,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.grey300,
  },
  resultRowDisabled: {
    opacity: 0.6,
  },
  resultName: {
    fontSize: FontSize.md,
    fontWeight: "500",
    color: Palette.black,
  },
  resultEmail: {
    fontSize: FontSize.sm,
    color: Palette.grey600,
    marginTop: 2,
  },
  addedLabel: {
    fontSize: FontSize.sm,
    color: Palette.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  emptyResults: {
    fontSize: FontSize.sm,
    color: Palette.grey500,
    padding: 16,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.grey200,
    borderRadius: BorderRadius.pill,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 4,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Palette.black,
    maxWidth: 140,
  },
  chipRemove: {
    marginLeft: 4,
    padding: 4,
  },
  chipRemoveText: {
    fontSize: FontSize.lg,
    color: Palette.grey600,
    fontWeight: "600",
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: Palette.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: Palette.white,
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
});
