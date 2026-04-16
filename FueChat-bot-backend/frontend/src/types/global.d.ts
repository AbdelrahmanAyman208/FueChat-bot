export type UserRole = 'student' | 'advisor' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: string[];
  status?: 'streaming' | 'complete' | 'error';
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  major: string;
  gpa: number;
  completedCourses: string[];
  academicProgress: string;
  preferences: string;
  interests: string;
  studyLoadPreference: 'light' | 'balanced' | 'intensive';
}

export interface CourseRecommendation {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  semester: string;
  prerequisites: string[];
  reason: string;
  score: number;
}

export interface GraduationRequirement {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'pending';
  credits: number;
}

export interface RequirementsOverview {
  totalCreditsRequired: number;
  completedCredits: number;
  remainingCredits: number;
  coreRequirements: GraduationRequirement[];
  electives: GraduationRequirement[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
}
