import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const loadTheme = createAsyncThunk('theme/load', async () => {
  const savedTheme = await AsyncStorage.getItem('appTheme');
  return savedTheme || 'system';
});

export const setTheme = createAsyncThunk('theme/set', async (theme) => {
  await AsyncStorage.setItem('appTheme', theme);
  return theme;
});

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    value: 'system',
    loading: true,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadTheme.fulfilled, (state, action) => {
      state.value = action.payload;
      state.loading = false;
    });
    builder.addCase(setTheme.fulfilled, (state, action) => {
      state.value = action.payload;
    });
  },
});

export default themeSlice.reducer;
