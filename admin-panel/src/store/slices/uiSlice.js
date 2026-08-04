'use client';

import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    activeSection: 'dashboard',
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setActiveSection: (state, action) => {
      state.activeSection = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, setActiveSection } = uiSlice.actions;
export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed;
export const selectActiveSection = (state) => state.ui.activeSection;
export default uiSlice.reducer;
