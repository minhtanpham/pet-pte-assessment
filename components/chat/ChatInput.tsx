import { BorderRadius, FontSize, Palette, Spacing } from '@/constants';
import { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }, [text, onSend]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Message..."
        placeholderTextColor={Palette.grey500
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
        returnKeyType="default"
        editable={!disabled}
      />
      <TouchableOpacity
        style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}>
        <IconSymbol name="paperplane.fill" size={20} color={Palette.white />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.grey300,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.grey300,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Palette.black,
    maxHeight: 120,
    backgroundColor: Palette.grey100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Palette.grey400,
  },
});
