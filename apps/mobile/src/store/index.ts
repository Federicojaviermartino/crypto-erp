import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import invoicesReducer from './slices/invoicesSlice';

/**
 * Redux Store Configuration
 * with Redux Persist for offline support
 */

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'companyId', 'accessToken', 'refreshToken', 'isAuthenticated'],
};

export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer),
    invoices: invoicesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
