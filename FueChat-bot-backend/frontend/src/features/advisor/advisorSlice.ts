import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, isApiError } from '../../services/api';

// ── Types ────────────────────────────────────────────────────────
export interface AdvisorStudent {
  student_id: number;
  university_id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string;
  gpa: number;
  credits_earned: number;
  completed_courses: number;
  in_progress_courses: number;
}

export interface StudentCourse {
  course_id: number;
  code: string;
  name: string;
  credits: number;
  instructor: string;
  semester: string;
  status: string;
}

export interface StudentDetail {
  student: {
    student_id: number;
    university_id: string;
    first_name: string;
    last_name: string;
    email: string;
    gpa: number;
    major: string;
    degree_description: string;
    credits_needed: number;
    credits_earned: number;
    credits_remaining: number;
  };
  courses: {
    completed: StudentCourse[];
    in_progress: StudentCourse[];
    planned: StudentCourse[];
    failed?: StudentCourse[];
  };
}

interface AdvisorState {
  students: AdvisorStudent[];
  searchResults: AdvisorStudent[];
  selectedStudent: StudentDetail | null;
  allCourses: { code: string; name: string; credits: number }[];
  status: 'idle' | 'loading' | 'error';
  detailStatus: 'idle' | 'loading' | 'error';
  actionStatus: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

const initialState: AdvisorState = {
  students: [],
  searchResults: [],
  selectedStudent: null,
  allCourses: [],
  status: 'idle',
  detailStatus: 'idle',
  actionStatus: 'idle',
  error: null,
};

// ── Thunks ───────────────────────────────────────────────────────

export const fetchAssignedStudents = createAsyncThunk<AdvisorStudent[], void, { rejectValue: string }>(
  'advisor/fetchStudents',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get<{ students: AdvisorStudent[] }>('/api/advisor/students');
      return res.data.students;
    } catch (error) {
      if (isApiError(error)) return rejectWithValue(error.response?.data?.message ?? 'Failed to load students');
      return rejectWithValue('Failed to load students');
    }
  }
);

export const fetchStudentDetail = createAsyncThunk<StudentDetail, number, { rejectValue: string }>(
  'advisor/fetchStudentDetail',
  async (studentId, { rejectWithValue }) => {
    try {
      const res = await api.get<StudentDetail>(`/api/advisor/students/${studentId}`);
      return res.data;
    } catch (error) {
      if (isApiError(error)) return rejectWithValue(error.response?.data?.message ?? 'Failed to load student details');
      return rejectWithValue('Failed to load student details');
    }
  }
);

export const fetchAllCourses = createAsyncThunk<{ code: string; name: string; credits: number }[], void, { rejectValue: string }>(
  'advisor/fetchAllCourses',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get<{ courses: any[] }>('/api/courses');
      return res.data.courses.map((c: any) => ({ code: c.code, name: c.name, credits: c.credits }));
    } catch (error) {
      if (isApiError(error)) return rejectWithValue(error.response?.data?.message ?? 'Failed to load courses');
      return rejectWithValue('Failed to load courses');
    }
  }
);

export const searchGlobalStudents = createAsyncThunk<AdvisorStudent[], string, { rejectValue: string }>(
  'advisor/searchStudents',
  async (query, { rejectWithValue }) => {
    try {
      const res = await api.get<{ students: AdvisorStudent[] }>(`/api/advisor/students/search?query=${encodeURIComponent(query)}`);
      return res.data.students;
    } catch (error) {
      if (isApiError(error)) return rejectWithValue(error.response?.data?.message ?? 'Failed to search students');
      return rejectWithValue('Failed to search students');
    }
  }
);

export const enrollStudentCourse = createAsyncThunk<
  string,
  { studentId: number; courseCode: string; status: string },
  { rejectValue: string }
>(
  'advisor/enrollCourse',
  async ({ studentId, courseCode, status }, { rejectWithValue }) => {
    try {
      const res = await api.post<{ message: string }>(`/api/advisor/students/${studentId}/enroll`, { courseCode, status });
      return res.data.message;
    } catch (error) {
      if (isApiError(error)) return rejectWithValue(error.response?.data?.message ?? 'Failed to enroll student');
      return rejectWithValue('Failed to enroll student');
    }
  }
);

export const updateStudentCourseStatus = createAsyncThunk<
  string,
  { studentId: number; courseCode: string; status: string },
  { rejectValue: string }
>(
  'advisor/updateCourseStatus',
  async ({ studentId, courseCode, status }, { rejectWithValue }) => {
    try {
      const res = await api.patch<{ message: string }>(`/api/advisor/students/${studentId}/course/${courseCode}`, { status });
      return res.data.message;
    } catch (error) {
      if (isApiError(error)) return rejectWithValue(error.response?.data?.message ?? 'Failed to update course status');
      return rejectWithValue('Failed to update course status');
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────

const advisorSlice = createSlice({
  name: 'advisor',
  initialState,
  reducers: {
    clearSelectedStudent: (state) => {
      state.selectedStudent = null;
      state.detailStatus = 'idle';
    },
    clearActionStatus: (state) => {
      state.actionStatus = 'idle';
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch assigned students
      .addCase(fetchAssignedStudents.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchAssignedStudents.fulfilled, (state, action) => { state.status = 'idle'; state.students = action.payload; })
      .addCase(fetchAssignedStudents.rejected, (state, action) => { state.status = 'error'; state.error = action.payload ?? 'Error'; })
      // Search students
      .addCase(searchGlobalStudents.fulfilled, (state, action) => { state.searchResults = action.payload; })
      .addCase(searchGlobalStudents.rejected, (state, action) => { state.error = action.payload ?? 'Error'; })
      // Fetch student detail
      .addCase(fetchStudentDetail.pending, (state) => { state.detailStatus = 'loading'; })
      .addCase(fetchStudentDetail.fulfilled, (state, action) => { state.detailStatus = 'idle'; state.selectedStudent = action.payload; })
      .addCase(fetchStudentDetail.rejected, (state, action) => { state.detailStatus = 'error'; state.error = action.payload ?? 'Error'; })
      // Fetch all courses
      .addCase(fetchAllCourses.fulfilled, (state, action) => { state.allCourses = action.payload; })
      // Enroll course
      .addCase(enrollStudentCourse.pending, (state) => { state.actionStatus = 'loading'; })
      .addCase(enrollStudentCourse.fulfilled, (state) => { state.actionStatus = 'success'; })
      .addCase(enrollStudentCourse.rejected, (state, action) => { state.actionStatus = 'error'; state.error = action.payload ?? 'Error'; })
      // Update course status
      .addCase(updateStudentCourseStatus.pending, (state) => { state.actionStatus = 'loading'; })
      .addCase(updateStudentCourseStatus.fulfilled, (state) => { state.actionStatus = 'success'; })
      .addCase(updateStudentCourseStatus.rejected, (state, action) => { state.actionStatus = 'error'; state.error = action.payload ?? 'Error'; });
  },
});

export const { clearSelectedStudent, clearActionStatus, clearSearchResults } = advisorSlice.actions;
export default advisorSlice.reducer;
