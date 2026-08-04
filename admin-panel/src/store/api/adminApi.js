'use client';

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}/admin`,
    prepareHeaders: (headers) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('sk_admin_token') : null;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Applications', 'Lenders', 'LenderRules', 'Dealers', 'Staff', 'Commissions', 'Withdrawals', 'Settings', 'AuditLog'],
  endpoints: (builder) => ({
    // Dashboard
    getDashboard: builder.query({
      query: ({ from, to } = {}) => ({
        url: '/dashboard',
        params: { from, to }
      }),
    }),

    // Applications
    getApplications: builder.query({
      query: ({ status, stage, limit = 20, offset = 0, from, to } = {}) => ({
        url: '/applications',
        params: { status, stage, limit, offset, from, to },
      }),
      providesTags: ['Applications'],
    }),
    getApplication: builder.query({
      query: (id) => `/applications/${id}`,
      providesTags: (result, error, id) => [{ type: 'Applications', id }],
    }),
    getStageEntries: builder.query({
      query: (id) => `/applications/${id}/stage-entries`,
    }),
    addStageEntry: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/applications/${id}/stage-entry`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Applications'],
    }),
    disburse: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/applications/${id}/disburse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Applications', 'Commissions'],
    }),
    reApprove: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/applications/${id}/re-approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Applications'],
    }),

    // Lenders
    getLenders: builder.query({
      query: () => '/lenders',
      providesTags: ['Lenders'],
    }),
    updateLender: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/lenders/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => ['Lenders', { type: 'LenderRules', id }],
    }),
    createLender: builder.mutation({
      query: (body) => ({
        url: '/lenders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Lenders'],
    }),
    deleteLender: builder.mutation({
      query: (id) => ({
        url: `/lenders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Lenders'],
    }),
    getLenderRules: builder.query({
      query: (id) => `/lenders/${id}/rules`,
      providesTags: (result, error, id) => [{ type: 'LenderRules', id }],
    }),

    // Dealers
    getDealers: builder.query({
      query: () => '/dealers',
      providesTags: ['Dealers'],
    }),
    createDealer: builder.mutation({
      query: (body) => ({ url: '/dealers', method: 'POST', body }),
      invalidatesTags: ['Dealers'],
    }),

    // Staff
    getStaff: builder.query({
      query: () => '/staff',
      providesTags: ['Staff'],
    }),
    createStaff: builder.mutation({
      query: (body) => ({ url: '/staff', method: 'POST', body }),
      invalidatesTags: ['Staff'],
    }),
    updateStaff: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/staff/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Staff'],
    }),
    deleteStaff: builder.mutation({
      query: (id) => ({
        url: `/staff/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff'],
    }),

    // Commissions & Payouts
    getCommissions: builder.query({
      query: ({ from, to } = {}) => ({ url: '/commissions', params: { from, to } }),
      providesTags: ['Commissions'],
    }),
    getWithdrawals: builder.query({
      query: ({ status } = {}) => ({ url: '/withdrawal-requests', params: { status } }),
      providesTags: ['Withdrawals'],
    }),
    processWithdrawal: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/withdrawal-requests/${id}/process`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Withdrawals'],
    }),

    // Settings
    getSettings: builder.query({
      query: () => '/settings',
      providesTags: ['Settings'],
    }),
    updateSetting: builder.mutation({
      query: ({ key, value }) => ({
        url: `/settings/${key}`,
        method: 'PATCH',
        body: { value },
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetApplicationsQuery,
  useGetApplicationQuery,
  useGetStageEntriesQuery,
  useAddStageEntryMutation,
  useDisburseMutation,
  useReApproveMutation,
  useGetLendersQuery,
  useUpdateLenderMutation,
  useCreateLenderMutation,
  useDeleteLenderMutation,
  useGetLenderRulesQuery,
  useGetDealersQuery,
  useCreateDealerMutation,
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useGetCommissionsQuery,
  useGetWithdrawalsQuery,
  useProcessWithdrawalMutation,
  useGetSettingsQuery,
  useUpdateSettingMutation,
} = adminApi;
