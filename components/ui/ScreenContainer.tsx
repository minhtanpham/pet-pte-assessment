import { Palette } from '@/constants';
import { StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
  backgroundColor?: string;
}

export function ScreenContainer({
  children,
  edges = ['top', 'bottom'],
  style,
  backgroundColor = Palette.white,
}: Props) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
