import { createMMKV } from 'react-native-mmkv';
import type { Storage as ReduxPersistStorage } from 'redux-persist';

export const mmkv = createMMKV({ id: 'app-storage' });

// Redux Persist adapter
export const mmkvStorage: ReduxPersistStorage = {
  setItem: (key, value) => {
    mmkv.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key) => {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem: (key) => {
    mmkv.remove(key);
    return Promise.resolve();
  },
};

// Typed helpers for general app use
export const Storage = {
  getString: (key: string): string | undefined => mmkv.getString(key),
  setString: (key: string, value: string): void => mmkv.set(key, value),
  getBoolean: (key: string): boolean | undefined => mmkv.getBoolean(key),
  setBoolean: (key: string, value: boolean): void => mmkv.set(key, value),
  getObject: <T>(key: string): T | undefined => {
    const raw = mmkv.getString(key);
    if (!raw) return undefined;
    try { return JSON.parse(raw) as T; } catch { return undefined; }
  },
  setObject: <T>(key: string, value: T): void => {
    mmkv.set(key, JSON.stringify(value));
  },
  delete: (key: string): void => { mmkv.remove(key); },
};
