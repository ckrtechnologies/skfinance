import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import filterReducer from './slices/filterSlice';
import { dealerApi } from './api/dealerApi';

const appReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  filter: filterReducer,
  [dealerApi.reducerPath]: dealerApi.reducer,
});

const rootReducer = (state, action) => {
  if (action.type === 'auth/logoutUser/fulfilled') {
    // Keep auth (for isInitialized) and theme state, but wipe RTK query cache and filters
    state = {
      auth: state.auth,
      theme: state.theme
    };
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(dealerApi.middleware),
});
