import { View, Text, StyleSheet } from 'react-native';

interface Props {
  name: string;
  participants: string[];
}

export function GroupHeader({ name, participants }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      <View style={styles.avatars}>
        {participants.slice(0, 4).map((uid, i) => (
          <View key={uid} style={[styles.avatar, { marginLeft: i > 0 ? -8 : 0 }]}>
            <Text style={styles.avatarText}>{uid.charAt(0).toUpperCase()}</Text>
          </View>
        ))}
        {participants.length > 4 && (
          <View style={[styles.avatar, { marginLeft: -8, backgroundColor: '#9BA1A6' }]}>
            <Text style={styles.avatarText}>+{participants.length - 4}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  name: { fontSize: 16, fontWeight: '600', color: '#11181C' },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  avatarText: { color: '#fff', fontSize: 10, fontWeight: '600' },
});
