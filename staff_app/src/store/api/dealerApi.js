import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as Keychain from 'react-native-keychain';
import Config from 'react-native-config';
import { Platform } from 'react-native';
import { logoutUser } from '../slices/authSlice';

const getApiUrl = () => {
  let url = Config.API_URL || 'http://localhost:4000';
  if (Platform.OS === 'android' && url.includes('localhost')) {
    url = url.replace('localhost', '10.0.2.2');
  }
  return url;
};

const BASE_URL = getApiUrl();

const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}/dealer`,
  prepareHeaders: async (headers) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        headers.set('Authorization', `Bearer ${credentials.password}`);
      }
    } catch (error) {
      console.error("Keychain couldn't be accessed!", error);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // If the token is invalid/expired, log the user out globally
  if (result.error && result.error.status === 401) {
    api.dispatch(logoutUser());
  }
  
  return result;
};

export const dealerApi = createApi({
  reducerPath: 'dealerApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Profile', 'Wallet', 'Commissions', 'Applications'],
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => '/profile',
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({
        url: '/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    uploadAvatar: builder.mutation({
      query: (formData) => ({
        url: '/profile/avatar',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['Profile'],
    }),
    deleteAccount: builder.mutation({
      query: () => ({
        url: '/profile',
        method: 'DELETE',
      }),
    }),
    getWallet: builder.query({
      query: (params) => {
        let qs = '';
        if (params?.startDate) qs += `?startDate=${params.startDate}`;
        if (params?.endDate) qs += `${qs ? '&' : '?'}endDate=${params.endDate}`;
        return `/wallet${qs}`;
      },
      providesTags: ['Wallet'],
    }),
    getCommissions: builder.query({
      query: (params) => {
        let qs = '';
        if (params?.startDate) qs += `?startDate=${params.startDate}`;
        if (params?.endDate) qs += `${qs ? '&' : '?'}endDate=${params.endDate}`;
        return `/commissions${qs}`;
      },
      providesTags: ['Commissions'],
    }),
    requestWithdrawal: builder.mutation({
      query: (body) => ({
        url: '/withdrawal-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'Commissions'],
    }),
    getWithdrawalRequests: builder.query({
      query: (params) => {
        let qs = '';
        if (params?.startDate) qs += `?startDate=${params.startDate}`;
        if (params?.endDate) qs += `${qs ? '&' : '?'}endDate=${params.endDate}`;
        return `/withdrawal-requests${qs}`;
      },
      providesTags: ['Wallet'],
    }),
    getNotifications: builder.query({
      query: () => '/notifications',
    }),
    checkEligibility: builder.mutation({
      query: (body) => ({
        url: '/pre-check',
        method: 'POST',
        body,
      }),
    }),
    getBanners: builder.query({
      query: () => '/banners',
    }),
    getApplications: builder.query({
      query: ({ search, status, stage, startDate, endDate, page = 1, limit = 100 } = {}) => ({
        url: '/applications',
        params: { search, status, stage, startDate, endDate, limit, offset: (page - 1) * limit },
      }),
      providesTags: ['Applications'],
      serializeQueryArgs: ({ queryArgs }) => {
        const { search, status, stage, startDate, endDate } = queryArgs || {};
        return { search, status, stage, startDate, endDate };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (!arg || arg.page === 1 || arg.page === undefined) return newItems;
        if (newItems && Array.isArray(newItems.data)) {
          if (!currentCache.data) currentCache.data = [];
          currentCache.data.push(...newItems.data);
          currentCache.count = newItems.count;
        }
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page || 
               currentArg?.status !== previousArg?.status || 
               currentArg?.stage !== previousArg?.stage ||
               currentArg?.startDate !== previousArg?.startDate ||
               currentArg?.endDate !== previousArg?.endDate;
      },
    }),
    getApplicationDetails: builder.query({
      query: (id) => `/applications/${id}`,
      providesTags: (result, error, id) => [{ type: 'Applications', id }],
    }),
    getStageEntries: builder.query({
      query: (id) => `/applications/${id}/stage-entries`,
      providesTags: (result, error, id) => [{ type: 'Applications', id }],
    }),
    submitApplication: builder.mutation({
      query: (body) => ({
        url: '/applications',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Applications'],
    }),
    resubmitClarification: builder.mutation({
      query: ({ id, notes, queryId, documentIds }) => ({
        url: `/applications/${id}/clarification`,
        method: 'POST',
        body: { notes, queryId, documentIds },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Applications', id }, 'Applications'],
    }),
    fetchCibil: builder.mutation({
      query: (body) => ({
        url: '/applications/cibil/fetch',
        method: 'POST',
        body,
      }),
    }),
    getDigilockerAuthUrl: builder.mutation({
      query: () => ({
        url: '/../digilocker/auth-url',
        method: 'GET',
      }),
    }),
    processDigilocker: builder.mutation({
      query: (body) => ({
        url: '/../digilocker/process',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Applications', id: arg.application_no }, 'Applications'],
    }),
    previewDigilocker: builder.mutation({
      query: (body) => ({
        url: '/../digilocker/preview',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetWalletQuery,
  useGetBannersQuery,
  useGetCommissionsQuery,
  useRequestWithdrawalMutation,
  useGetApplicationsQuery,
  useGetApplicationDetailsQuery,
  useGetStageEntriesQuery,
  useSubmitApplicationMutation,
  useResubmitClarificationMutation,
  useGetWithdrawalRequestsQuery,
  useGetNotificationsQuery,
  useCheckEligibilityMutation,
  useFetchCibilMutation,
  useUploadAvatarMutation,
  useDeleteAccountMutation,
  useGetDigilockerAuthUrlMutation,
  useProcessDigilockerMutation,
  usePreviewDigilockerMutation,
} = dealerApi;
