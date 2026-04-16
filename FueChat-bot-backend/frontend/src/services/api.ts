import axios, { AxiosError } from 'axios';
import type { AppStore } from '../app/store';
import { logout } from '../features/auth/authSlice';
import { addToast } from '../features/ui/uiSlice';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? process.env.REACT_APP_API_URL ?? '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true, // send session cookies with every request
  headers: {
    'Content-Type': 'application/json'
  }
});

let appStore: AppStore | null = null;

export const registerApiStore = (store: AppStore) => {
  appStore = store;
};

// No Bearer token interceptor — cookies are sent automatically

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Don't trigger logout toast on the /me session check — that's expected to 401
    const url = error.config?.url || '';
    const isMeCheck = url.includes('/auth/me');

    if (error.response?.status === 401 && !isMeCheck) {
      appStore?.dispatch(logout());
      appStore?.dispatch(
        addToast({
          title: 'Session expired',
          description: 'Please sign in again to continue.',
          variant: 'warning'
        })
      );
    }
    return Promise.reject(error);
  }
);

export type ApiError = AxiosError<{ message?: string }>;

export const isApiError = (error: unknown): error is ApiError => axios.isAxiosError(error);
