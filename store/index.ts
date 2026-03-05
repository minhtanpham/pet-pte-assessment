import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import { mmkvStorage } from '@/lib/storage';

import authReducer from './slices/auth-slice';
import chatReducer from './slices/chat-slice';
import networkReducer from './slices/network-slice';

const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  network: networkReducer,
});

const persistConfig = {
  key: 'root',
  storage: mmkvStorage,
  whitelist: ['chat'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
