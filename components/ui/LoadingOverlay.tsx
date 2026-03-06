import { Palette } from '@/constants';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface Props {
  color?: string;
}

export function LoadingOverlay({ color = Palette.primary }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
