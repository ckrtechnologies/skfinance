import { createSlice } from '@reduxjs/toolkit';
import { getStartOfMonth } from '../../ui/DateRangePickerModal';

// Set initial global date range to 'All Time' so dealers see lifetime success on app load
const initialState = {
  activePreset: 'All Time',
  dateRange: { start: null, end: null }
};

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setDateFilter: (state, action) => {
      state.activePreset = action.payload.preset;
      const start = action.payload.dateRange?.start;
      const end = action.payload.dateRange?.end;
      
      const parseIso = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (val instanceof Date || (typeof val === 'object' && typeof val.toISOString === 'function')) {
          return val.toISOString();
        }
        return String(val);
      };

      state.dateRange = {
        start: parseIso(start),
        end: parseIso(end)
      };
    },
  },
});

export const { setDateFilter } = filterSlice.actions;
export default filterSlice.reducer;
