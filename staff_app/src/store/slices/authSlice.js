import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import Config from 'react-native-config';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

const getApiUrl = () => {
  let url = Config.API_URL || 'http://localhost:4000';
  if (Platform.OS === 'android' && url.includes('localhost')) {
    url = url.replace('localhost', '10.0.2.2');
  }
  return url;
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ identifier, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role: 'dealer' }),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || data.message || 'Login failed');
      }

      const token = data.token || data.data?.token;
      const user = data.user || data.profile || data.data?.profile;

      if (!token) {
        return rejectWithValue('No token returned from server');
      }

      await Keychain.setGenericPassword('dealer', token);
      return { token, user };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const requestOtpUser = createAsyncThunk(
  'auth/requestOtp',
  async ({ identifier }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.error?.message || data.error || data.message || 'OTP request failed';
        return rejectWithValue(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const verifyOtpUser = createAsyncThunk(
  'auth/verifyOtp',
  async ({ identifier, otp }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, intent: 'dealer' }),  // Signal dealer intent
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.error?.message || data.error || data.message || 'OTP verification failed';
        return rejectWithValue(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }

      const token = data.token || data.data?.token;
      const user = data.user || data.profile || data.data?.profile;
      if (!token) return rejectWithValue('No token returned from server');

      await Keychain.setGenericPassword('dealer', token);
      return { token, user };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);


export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async () => {
    await Keychain.resetGenericPassword();
    return null;
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async () => {
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      return { token: credentials.password }; // We could decode JWT to get user details here
    }
    throw new Error('Not authenticated');
  }
);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  isInitialized: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyOtpUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtpUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(verifyOtpUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      })
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.loading = false;
        state.isInitialized = true;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.loading = false;
        state.isInitialized = true;
      });
  },
});

export default authSlice.reducer;
