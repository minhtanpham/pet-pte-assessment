import NetInfo from '@react-native-community/netinfo';
import { setConnected } from '@/store/slices/network-slice';
import type { AppDispatch } from '@/store';

export function startNetworkListener(dispatch: AppDispatch): () => void {
  return NetInfo.addEventListener((state) => {
    dispatch(setConnected(state.isConnected ?? false));
  });
}
