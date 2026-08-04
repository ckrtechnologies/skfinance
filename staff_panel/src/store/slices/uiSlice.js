'use client';

import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    activeSection: 'dashboard',
    headerInfo: { title: 'Dashboard', breadcrumbs: ['Overview', 'Dashboard'] },
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
    setHeaderInfo: (state, action) => {
      state.headerInfo = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, setActiveSection, setHeaderInfo } = uiSlice.actions;
export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed;
export const selectActiveSection = (state) => state.ui.activeSection;
export const selectHeaderInfo = (state) => state.ui.headerInfo;
export default uiSlice.reducer;
