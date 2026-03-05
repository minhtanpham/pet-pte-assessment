import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Props {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

export function CallControls({ isMuted, isCameraOff, onToggleMute, onToggleCamera, onEndCall }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isMuted && styles.buttonActive]}
        onPress={onToggleMute}>
        <IconSymbol
          name={isMuted ? 'mic.slash.fill' : 'mic.fill'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.endButton} onPress={onEndCall}>
        <IconSymbol name="phone.down.fill" size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isCameraOff && styles.buttonActive]}
        onPress={onToggleCamera}>
        <IconSymbol
          name={isCameraOff ? 'video.slash.fill' : 'video.fill'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  endButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
