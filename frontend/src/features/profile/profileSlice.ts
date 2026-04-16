import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api, isApiError } from '../../services/api';
import { StudentProfile } from '../../types/global';

interface ProfileState {
  data: StudentProfile | null;
  status: 'idle' | 'loading' | 'saving' | 'error';
  error: string | null;
}

const initialState: ProfileState = {
  data: null,
  status: 'idle',
  error: null
};

/**
 * Maps the backend's raw profile response to the frontend's StudentProfile shape.
 * Backend returns: { student_id, first_name, last_name, email, gpa, major,
 *                    degree_description, credits_needed, credits_earned }
 */
function mapBackendProfile(raw: any): StudentProfile {
  return {
    id: String(raw.student_id),
    name: `${raw.first_name || ''} ${raw.last_name || ''}`.trim(),
    email: raw.email || '',
    major: raw.major || 'Undeclared',
    gpa: parseFloat(raw.gpa) || 0,
    completedCourses: [],  // will be populated separately if needed
    academicProgress: raw.credits_earned
      ? `${raw.credits_earned} credits earned` + (raw.credits_needed ? ` / ${raw.credits_needed} required` : '')
      : 'No data',
    preferences: '',
    interests: '',
    studyLoadPreference: 'balanced',
  };
}

export const fetchProfile = createAsyncThunk<StudentProfile, void, { rejectValue: string }>(
  'profile/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ profile: any }>('/api/student/profile');
      return mapBackendProfile(response.data.profile);
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.message ?? 'Unable to load profile');
      }
      return rejectWithValue('Unable to load profile');
    }
  }
);

export const updateProfile = createAsyncThunk<StudentProfile, Partial<StudentProfile>, { rejectValue: string }>(
  'profile/update',
  async (payload, { rejectWithValue }) => {
    try {
      await api.patch('/api/student/profile', {
        gpa: payload.gpa,
        major: payload.major,
      });
      // Re-fetch the full profile after update
      const response = await api.get<{ profile: any }>('/api/student/profile');
      return mapBackendProfile(response.data.profile);
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.message ?? 'Unable to save profile');
      }
      return rejectWithValue('Unable to save profile');
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<StudentProfile>) => {
      state.data = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = 'idle';
        state.data = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Unable to load profile';
      })
      .addCase(updateProfile.pending, (state) => {
        state.status = 'saving';
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.status = 'idle';
        state.data = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Unable to save profile';
      });
  }
});

export const { setProfile } = profileSlice.actions;
export default profileSlice.reducer;
