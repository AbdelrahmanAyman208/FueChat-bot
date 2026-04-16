import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import chatReducer from '../features/chat/chatSlice';
import profileReducer from '../features/profile/profileSlice';
import recommendationsReducer from '../features/recommendations/recommendationsSlice';
import requirementsReducer from '../features/requirements/requirementsSlice';
import uiReducer from '../features/ui/uiSlice';
import advisorReducer from '../features/advisor/advisorSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    profile: profileReducer,
    recommendations: recommendationsReducer,
    requirements: requirementsReducer,
    ui: uiReducer,
    advisor: advisorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
