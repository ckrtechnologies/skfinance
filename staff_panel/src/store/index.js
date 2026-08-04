'use client';

import { configureStore } from '@reduxjs/toolkit';
import dateRangeReducer from './slices/dateRangeSlice';
import uiReducer from './slices/uiSlice';
import { staffApi } from './api/staffApi';

export const store = configureStore({
  reducer: {
    dateRange: dateRangeReducer,
    ui: uiReducer,
    [staffApi.reducerPath]: staffApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(staffApi.middleware),
});
