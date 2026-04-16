import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, isApiError } from '../../services/api';
import { CourseRecommendation } from '../../types/global';

interface RecommendationsState {
  items: CourseRecommendation[];
  status: 'idle' | 'loading' | 'error';
  error: string | null;
}

const initialState: RecommendationsState = {
  items: [],
  status: 'idle',
  error: null
};

export const fetchRecommendations = createAsyncThunk<CourseRecommendation[], void, { rejectValue: string }>(
  'recommendations/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post<CourseRecommendation[]>('/api/chat/message', {
        message: 'What courses should I register for next semester? Please recommend courses based on my academic profile.'
      });
      // The AI response comes as a chat message; for now, return empty
      // until a dedicated recommendations endpoint is built
      return [];
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.message ?? 'Unable to load recommendations');
      }
      return rejectWithValue('Unable to load recommendations');
    }
  }
);

const recommendationsSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecommendations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Unable to load recommendations';
      });
  }
});

export default recommendationsSlice.reducer;
