'use client';

import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { createSlice } from '@reduxjs/toolkit';

const today = new Date();

const presets = {
  today: {
    label: 'Today',
    from: format(startOfDay(today), 'yyyy-MM-dd'),
    to:   format(endOfDay(today), 'yyyy-MM-dd'),
  },
  last7: {
    label: 'Last 7 Days',
    from: format(startOfDay(subDays(today, 6)), 'yyyy-MM-dd'),
    to:   format(endOfDay(today), 'yyyy-MM-dd'),
  },
  last30: {
    label: 'Last 30 Days',
    from: format(startOfDay(subDays(today, 29)), 'yyyy-MM-dd'),
    to:   format(endOfDay(today), 'yyyy-MM-dd'),
  },
  last90: {
    label: 'Last 90 Days',
    from: format(startOfDay(subDays(today, 89)), 'yyyy-MM-dd'),
    to:   format(endOfDay(today), 'yyyy-MM-dd'),
  },
};

const dateRangeSlice = createSlice({
  name: 'dateRange',
  initialState: {
    from:   presets.last30.from,
    to:     presets.last30.to,
    preset: 'last30',
    label:  presets.last30.label,
    presets,
  },
  reducers: {
    setDateRange: (state, action) => {
      const { from, to, preset, label } = action.payload;
      state.from   = from;
      state.to     = to;
      state.preset = preset || 'custom';
      state.label  = label || `${from} – ${to}`;
    },
    applyPreset: (state, action) => {
      const key = action.payload;
      const p = state.presets[key];
      if (p) {
        state.from   = p.from;
        state.to     = p.to;
        state.preset = key;
        state.label  = p.label;
      }
    },
  },
});

export const { setDateRange, applyPreset } = dateRangeSlice.actions;
export const selectDateRange = (state) => state.dateRange;
export default dateRangeSlice.reducer;
