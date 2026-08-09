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
  tagTypes: ['Applications', 'Lenders', 'LenderRules', 'Dealers', 'Staff', 'Commissions', 'Withdrawals', 'Settings', 'AuditLog', 'Customers', 'Banners', 'WhatsApp'],
  endpoints: (builder) => ({
    // Dashboard
    getDashboard: builder.query({
      query: ({ from, to } = {}) => ({
        url: '/dashboard',
        params: { from, to }
      }),
    }),

    // Banners
    getBanners: builder.query({
      query: () => '/banners',
      providesTags: ['Banners'],
    }),
    createBanner: builder.mutation({
      query: (body) => ({
        url: '/banners',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Banners'],
    }),
    updateBanner: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/banners/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Banners'],
    }),
    deleteBanner: builder.mutation({
      query: (id) => ({
        url: `/banners/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Banners'],
    }),
    uploadBannerImage: builder.mutation({
      query: (formData) => ({
        url: '/banners/upload',
        method: 'POST',
        body: formData,
      }),
    }),

    // Applications
    getApplications: builder.query({
      query: ({ search, status, stage, assigned_staff_id, unassigned, limit = 20, offset = 0, from, to } = {}) => ({
        url: '/applications',
        params: { search, status, stage, assigned_staff_id, unassigned, limit, offset, from, to },
      }),
      providesTags: ['Applications'],
    }),
    getApplication: builder.query({
      query: (id) => `/applications/${id}`,
      providesTags: (result, error, id) => [{ type: 'Applications', id }],
    }),
    assignApplication: builder.mutation({
      query: ({ id, staff_ids }) => ({
        url: `/applications/${id}/assign`,
        method: 'POST',
        body: { staff_ids },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Applications', id }, 'Applications'],
    }),
    getStageEntries: builder.query({
      query: (id) => `/applications/${id}/stage-entries`,
      providesTags: (result, error, id) => [{ type: 'Applications', id }, 'Applications'],
    }),
    addStageEntry: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/applications/${id}/stage-entry`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Applications', id }, 'Applications'],
    }),
    disburse: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/applications/${id}/disburse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Applications', id }, 'Applications', 'Commissions'],
    }),
    reApprove: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/applications/${id}/re-approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Applications', id }, 'Applications'],
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
      query: ({ from, to } = {}) => ({ url: '/dealers', params: { from, to } }),
      providesTags: ['Dealers'],
    }),
    createDealer: builder.mutation({
      query: (body) => ({ url: '/dealers', method: 'POST', body }),
      invalidatesTags: ['Dealers'],
    }),
    updateDealer: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/dealers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Dealers'],
    }),
    deleteDealer: builder.mutation({
      query: (id) => ({
        url: `/dealers/${id}`,
        method: 'DELETE',
      }),
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
      query: ({ status, from, to } = {}) => ({ url: '/withdrawal-requests', params: { status, from, to } }),
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

    // Customers
    getCustomers: builder.query({
      query: ({ from, to } = {}) => ({ url: '/customers', params: { from, to } }),
      providesTags: ['Customers'],
    }),
    updateCustomer: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/customers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Customers'],
    }),
    deleteCustomer: builder.mutation({
      query: (id) => ({
        url: `/customers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Customers'],
    }),

    // WhatsApp Marketing
    getWaTemplates: builder.query({
      query: (params) => ({
        url: '/wa/templates',
        params
      }),
      providesTags: ['WhatsApp'],
    }),
    syncWaTemplates: builder.mutation({
      query: () => ({
        url: '/wa/templates/sync',
        method: 'POST'
      }),
      invalidatesTags: ['WhatsApp'],
    }),
    getWaMedia: builder.query({
      query: (id) => `/wa/media/${id}`,
    }),
    uploadWaMedia: builder.mutation({
      query: (formData) => ({
        url: '/wa/media',
        method: 'POST',
        body: formData,
      }),
    }),
    createWaCampaign: builder.mutation({
      query: (body) => ({
        url: '/wa/campaigns',
        method: 'POST',
        body
      }),
    }),
    sendWaCampaign: builder.mutation({
      query: (id) => ({
        url: `/wa/campaigns/${id}/send`,
        method: 'POST'
      }),
    }),
    cancelWaCampaign: builder.mutation({
      query: (id) => ({
        url: `/wa/campaigns/${id}/cancel`,
        method: 'POST'
      }),
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetApplicationsQuery,
  useGetApplicationQuery,
  useAssignApplicationMutation,
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
  useUpdateDealerMutation,
  useDeleteDealerMutation,
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useGetCommissionsQuery,
  useGetWithdrawalsQuery,
  useProcessWithdrawalMutation,
  useGetBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useUploadBannerImageMutation,
  useGetSettingsQuery,
  useUpdateSettingMutation,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetWaTemplatesQuery,
  useSyncWaTemplatesMutation,
  useGetWaMediaQuery,
  useUploadWaMediaMutation,
  useCreateWaCampaignMutation,
  useSendWaCampaignMutation,
  useCancelWaCampaignMutation,
} = adminApi;
