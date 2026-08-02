import axios from 'axios';
import { store } from '../store/store';
import { logout } from '../store/slices/authSlice';

const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:4000/v1'}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Auto logout if token is invalid/expired
      store.dispatch(logout());
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default apiClient;
