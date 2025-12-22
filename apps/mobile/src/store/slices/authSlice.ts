import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';
import { STORAGE_KEYS } from '../../utils/constants';

/**
 * Auth Slice
 * Manages authentication state and actions
 */

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
}

interface AuthState {
  user: User | null;
  companyId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requires2FA: boolean;
}

const initialState: AuthState = {
  user: null,
  companyId: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  requires2FA: false,
};

// Async Thunks

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);

      if (response.requires2FA) {
        return { requires2FA: true, tempToken: response.tempToken };
      }

      // Save tokens
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));

      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  },
);

export const verify2FA = createAsyncThunk(
  'auth/verify2FA',
  async ({ code, tempToken }: { code: string; tempToken: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/verify-2fa', { code, tempToken });

      // Save tokens
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));

      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '2FA verification failed');
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      companyName: string;
      taxId: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.post('/auth/register', data);

      // Save tokens
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      await AsyncStorage.setItem(STORAGE_KEYS.COMPANY_ID, response.company.id);

      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.COMPANY_ID,
  ]);
});

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async () => {
  const [accessToken, refreshToken, userJson, companyId] = await AsyncStorage.multiGet([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.COMPANY_ID,
  ]);

  if (accessToken[1] && userJson[1]) {
    return {
      accessToken: accessToken[1],
      refreshToken: refreshToken[1],
      user: JSON.parse(userJson[1]),
      companyId: companyId[1],
    };
  }

  return null;
});

// Slice

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCompanyId: (state, action: PayloadAction<string>) => {
      state.companyId = action.payload;
      AsyncStorage.setItem(STORAGE_KEYS.COMPANY_ID, action.payload);
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;

      if (action.payload.requires2FA) {
        state.requires2FA = true;
      } else {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.companyId = action.payload.company?.id || null;
        state.isAuthenticated = true;
        state.requires2FA = false;
      }
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Verify 2FA
    builder.addCase(verify2FA.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(verify2FA.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.companyId = action.payload.company?.id || null;
      state.isAuthenticated = true;
      state.requires2FA = false;
    });
    builder.addCase(verify2FA.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.companyId = action.payload.company.id;
      state.isAuthenticated = true;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      return initialState;
    });

    // Load Stored Auth
    builder.addCase(loadStoredAuth.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.companyId = action.payload.companyId;
        state.isAuthenticated = true;
      }
    });
  },
});

export const { clearError, setCompanyId } = authSlice.actions;
export default authSlice.reducer;
