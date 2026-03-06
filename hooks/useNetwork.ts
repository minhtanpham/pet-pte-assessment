import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { startNetworkListener } from '@/lib/network';

export function useNetwork() {
  const dispatch = useDispatch<AppDispatch>();
  const isConnected = useSelector((state: RootState) => state.network.isConnected);

  useEffect(() => {
    const unsubscribe = startNetworkListener(dispatch);
    return unsubscribe;
  }, [dispatch]);

  return { isConnected };
}
