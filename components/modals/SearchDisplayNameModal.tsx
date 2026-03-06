import { BorderRadius, FontSize, Palette } from "@/constants";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SheetModal } from "./SheetModal";

export type SearchResultUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
};

export interface SearchDisplayNameModalProps {
  visible: boolean;
  searching: boolean;
  searchQuery: string;
  results: SearchResultUser[];
  onChangeSearchQuery: (value: string) => void;
  onSearch: () => void;
  onSelectUser: (uid: string) => void;
  onClose: () => void;
}

export function SearchDisplayNameModal({
  visible,
  searching,
  searchQuery,
  results,
  onChangeSearchQuery,
  onSearch,
  onSelectUser,
  onClose,
}: SearchDisplayNameModalProps) {
  return (
    <SheetModal visible={visible} title="New Chat" onClose={onClose}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by display name..."
          placeholderTextColor={Palette.grey500}
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={onSearch}>
          {searching ? (
            <ActivityIndicator size="small" color={Palette.white} />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {results.map((user) => (
        <TouchableOpacity
          key={user.uid}
          style={styles.userItem}
          onPress={() => onSelectUser(user.uid)}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(user.displayName ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{user.displayName}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
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
    justifyContent: "center",
  },
  searchButtonText: { color: Palette.white, fontWeight: "600" },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarText: { color: Palette.white, fontSize: FontSize.lg, fontWeight: "600" },
  userName: { fontSize: FontSize.md, fontWeight: "600", color: Palette.black },
  userEmail: { fontSize: FontSize.sm, color: Palette.grey600 },
});

