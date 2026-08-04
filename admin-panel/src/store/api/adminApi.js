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
  tagTypes: ['Applications', 'Lenders', 'Dealers', 'Staff', 'Commissions', 'Withdrawals', 'Settings', 'AuditLog'],
  endpoints: (builder) => ({
    // Dashboard
    getDashboard: builder.query({
      query: () => '/dashboard',
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
      invalidatesTags: ['Lenders'],
    }),
    getLenderRules: builder.query({
      query: (code) => `/lenders/${code}/rules`,
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

    // Audit Log
    getAuditLog: builder.query({
      query: ({ from, to } = {}) => ({ url: '/audit-log', params: { from, to } }),
      providesTags: ['AuditLog'],
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
  useGetLenderRulesQuery,
  useGetDealersQuery,
  useCreateDealerMutation,
  useGetStaffQuery,
  useCreateStaffMutation,
  useGetCommissionsQuery,
  useGetWithdrawalsQuery,
  useProcessWithdrawalMutation,
  useGetSettingsQuery,
  useUpdateSettingMutation,
  useGetAuditLogQuery,
} = adminApi;
