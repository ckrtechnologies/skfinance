'use client';

import { configureStore } from '@reduxjs/toolkit';
import dateRangeReducer from './slices/dateRangeSlice';
import uiReducer from './slices/uiSlice';
import { adminApi } from './api/adminApi';

export const store = configureStore({
  reducer: {
    dateRange: dateRangeReducer,
    ui: uiReducer,
    [adminApi.reducerPath]: adminApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(adminApi.middleware),
});
