import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api, isApiError } from '../../services/api';
import { ChatMessage } from '../../types/global';

interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am FueBot, your AI academic advisor. How can I help you today?',
      timestamp: new Date().toISOString(),
      status: 'complete'
    }
  ],
  sessionId: null,
  isLoading: false,
  error: null
};

interface ChatResponse {
  sessionId: string;
  message: ChatMessage;
}

export const sendMessage = createAsyncThunk<ChatResponse, string, { rejectValue: string }>(
  'chat/sendMessage',
  async (prompt, { rejectWithValue, getState }) => {
    try {
      const { chat } = getState() as { chat: ChatState };
      const response = await api.post<ChatResponse>('/api/chat/message', {
        message: prompt,
        sessionId: chat.sessionId
      });
      return response.data;
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.message ?? 'Unable to send message');
      }
      return rejectWithValue('Unable to send message');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    clearChat: (state) => {
      state.messages = [];
      state.sessionId = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessionId = action.payload.sessionId;
        state.messages.push(action.payload.message);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to send message';
      });
  }
});

export const { addUserMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
