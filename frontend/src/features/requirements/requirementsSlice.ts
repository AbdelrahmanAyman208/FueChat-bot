import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, isApiError } from '../../services/api';
import { RequirementsOverview } from '../../types/global';

interface RequirementsState {
  data: RequirementsOverview | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
}

const initialState: RequirementsState = {
  data: null,
  status: 'idle',
  error: null
};

export const fetchRequirements = createAsyncThunk<RequirementsOverview, void, { rejectValue: string }>(
  'requirements/fetch',
  async (_, { rejectWithValue }) => {
    try {
      // Use the student courses endpoint to derive requirements
      const response = await api.get<any>('/api/courses/student/enrolled');
      const data = response.data;

      // Derive a requirements overview from the student's course data
      const completedCredits = (data.completed || []).reduce(
        (sum: number, c: any) => sum + (c.credits || 0), 0
      );
      const inProgressCredits = (data.in_progress || []).reduce(
        (sum: number, c: any) => sum + (c.credits || 0), 0
      );

      // Map backend courses to GraduationRequirement type
      const mapCourse = (c: any, status: 'completed' | 'pending') => ({
        id: c.course_id?.toString() || c.code,
        title: `${c.code} - ${c.name}`,
        description: c.semester ? `Taken in ${c.semester}` : `${c.credits} Credits`,
        status,
        credits: c.credits || 0,
        isElective: c.code?.includes('HUM') || c.code?.includes('ENG')
      });

      const allCourses = [
        ...(data.completed || []).map((c: any) => mapCourse(c, 'completed')),
        ...(data.in_progress || []).map((c: any) => mapCourse(c, 'pending')),
        ...(data.planned || []).map((c: any) => mapCourse(c, 'pending')),
        ...(data.failed || []).map((c: any) => mapCourse(c, 'pending'))
      ];

      const overview: RequirementsOverview = {
        totalCreditsRequired: 140,
        completedCredits,
        remainingCredits: Math.max(0, 140 - completedCredits),
        coreRequirements: allCourses.filter(c => !c.isElective),
        electives: allCourses.filter(c => c.isElective),
      };

      return overview;
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.message ?? 'Unable to load requirements');
      }
      return rejectWithValue('Unable to load requirements');
    }
  }
);

const requirementsSlice = createSlice({
  name: 'requirements',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRequirements.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRequirements.fulfilled, (state, action) => {
        state.status = 'idle';
        state.data = action.payload;
      })
      .addCase(fetchRequirements.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Unable to load requirements';
      });
  }
});

export default requirementsSlice.reducer;
