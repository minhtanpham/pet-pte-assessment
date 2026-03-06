import { BorderRadius, FontSize, Palette } from "@/constants";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SheetModal } from "./SheetModal";

export interface CreateNewGroupModalProps {
  visible: boolean;
  groupName: string;
  participantUids: string;
  onChangeGroupName: (value: string) => void;
  onChangeParticipantUids: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function CreateNewGroupModal({
  visible,
  groupName,
  participantUids,
  onChangeGroupName,
  onChangeParticipantUids,
  onCreate,
  onClose,
}: CreateNewGroupModalProps) {
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
        <TextInput
          style={styles.input}
          placeholder="Participant UIDs (comma-separated)"
          placeholderTextColor={Palette.grey500}
          value={participantUids}
          onChangeText={onChangeParticipantUids}
          multiline
        />
        <TouchableOpacity style={styles.createButton} onPress={onCreate}>
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
  createButton: {
    backgroundColor: Palette.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createButtonText: {
    color: Palette.white,
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
});

