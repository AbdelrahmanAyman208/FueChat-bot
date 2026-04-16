import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, isApiError } from '../../services/api';
import { AuthUser } from '../../types/global';

interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null
};

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  user: AuthUser;
  message?: string;
}

export const login = createAsyncThunk<LoginResponse, LoginPayload, { rejectValue: string }>(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', payload);
      return response.data;
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.message ?? 'Login failed');
      }
      return rejectWithValue('Login failed');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk<AuthUser, void, { rejectValue: string }>(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<AuthUser>('/api/auth/me');
      return response.data;
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.message ?? 'Unable to load user');
      }
      return rejectWithValue('Unable to load user');
    }
  }
);

export const logoutAsync = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.message ?? 'Logout failed');
      }
      return rejectWithValue('Logout failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.status = 'error';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Login failed';
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.status = 'error';
        state.user = null;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.status = 'error';
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
