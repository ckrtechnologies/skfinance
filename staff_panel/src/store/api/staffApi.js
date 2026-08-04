'use client';

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const staffApi = createApi({
  reducerPath: 'staffApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL + '/staff-panel',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Applications', 'Profile'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    getApplications: builder.query({
      query: (params) => ({
        url: '/applications',
        params,
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
        url: `/applications/${id}/stage`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Applications', id }, 'Applications'],
    }),
    getProfile: builder.query({
      query: () => '/auth/me',
      providesTags: ['Profile'],
    }),
    changePassword: builder.mutation({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetApplicationsQuery,
  useGetApplicationQuery,
  useGetStageEntriesQuery,
  useAddStageEntryMutation,
  useGetProfileQuery,
  useChangePasswordMutation,
} = staffApi;
