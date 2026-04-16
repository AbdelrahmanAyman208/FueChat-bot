import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ToastMessage } from '../../types/global';

interface UiState {
  toasts: ToastMessage[];
}

const initialState: UiState = {
  toasts: []
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast: {
      reducer: (state, action: PayloadAction<ToastMessage>) => {
        state.toasts.push(action.payload);
      },
      prepare: (payload: Omit<ToastMessage, 'id'> & { id?: string }) => ({
        payload: {
          id: payload.id ?? `toast-${Date.now()}`,
          ...payload
        }
      })
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    }
  }
});

export const { addToast, removeToast, clearToasts } = uiSlice.actions;
export default uiSlice.reducer;
