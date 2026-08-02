import { createSlice } from '@reduxjs/toolkit';

// Retrieve initial auth state from localStorage if available
const savedToken = localStorage.getItem('sk_admin_token');
const savedProfile = localStorage.getItem('sk_admin_profile');

const initialState = {
  isAuthenticated: !!savedToken,
  token: savedToken || null,
  profile: savedProfile ? JSON.parse(savedProfile) : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.profile = action.payload.profile;
      localStorage.setItem('sk_admin_token', action.payload.token);
      localStorage.setItem('sk_admin_profile', JSON.stringify(action.payload.profile));
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.profile = null;
      localStorage.removeItem('sk_admin_token');
      localStorage.removeItem('sk_admin_profile');
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
