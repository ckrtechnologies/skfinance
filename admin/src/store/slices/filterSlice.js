import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  dateRange: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(), // First day of current month
    endDate: new Date().toISOString(), // Today
  },
  globalSearch: '',
};

const filterSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    setGlobalSearch: (state, action) => {
      state.globalSearch = action.payload;
    },
    resetFilters: (state) => {
      state.dateRange = initialState.dateRange;
      state.globalSearch = '';
    },
  },
});

export const { setDateRange, setGlobalSearch, resetFilters } = filterSlice.actions;
export default filterSlice.reducer;
