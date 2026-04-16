import { AuthUser, CourseRecommendation, RequirementsOverview, StudentProfile } from '../types/global';

export const mockAuthUser: AuthUser = {
  id: 'stu-1024',
  name: 'Aisha Kareem',
  email: 'aisha.kareem@university.edu',
  role: 'student'
};

export const mockLoginResponse = {
  token: 'mock-jwt-token',
  user: mockAuthUser
};

export const mockProfile: StudentProfile = {
  id: 'stu-1024',
  name: 'Aisha Kareem',
  email: 'aisha.kareem@university.edu',
  major: 'Computer Science (AI Track)',
  gpa: 3.72,
  completedCourses: ['CS101', 'CS205', 'MATH210', 'STAT220', 'CS330'],
  academicProgress: 'Junior standing • 78 credits earned',
  preferences: 'Morning sessions, project-heavy courses',
  interests: 'NLP, recommender systems, HCI',
  studyLoadPreference: 'balanced'
};

export const mockRecommendations: CourseRecommendation[] = [
  {
    id: 'rec-1',
    code: 'CS402',
    name: 'Advanced Natural Language Processing',
    description: 'Sequence models, transformers, and evaluation of NLP systems.',
    credits: 3,
    semester: 'Fall 2026',
    prerequisites: ['CS330', 'STAT220'],
    reason: 'Aligns with your NLP interest and fills AI elective credits.',
    score: 96
  },
  {
    id: 'rec-2',
    code: 'CS415',
    name: 'Responsible AI Systems',
    description: 'Bias, fairness, interpretability, and governance for AI.',
    credits: 3,
    semester: 'Fall 2026',
    prerequisites: ['CS205'],
    reason: 'Recommended for compliance-focused capstone track.',
    score: 91
  },
  {
    id: 'rec-3',
    code: 'CS455',
    name: 'Applied Machine Learning Studio',
    description: 'Project-based ML product delivery with peer critiques.',
    credits: 4,
    semester: 'Spring 2027',
    prerequisites: ['CS330'],
    reason: 'Matches project-heavy preference and builds portfolio.',
    score: 88
  }
];

export const mockRequirements: RequirementsOverview = {
  totalCreditsRequired: 120,
  completedCredits: 78,
  remainingCredits: 42,
  coreRequirements: [
    {
      id: 'core-1',
      title: 'Core AI Foundations',
      description: 'Complete 12 credits in AI core courses.',
      status: 'completed',
      credits: 12
    },
    {
      id: 'core-2',
      title: 'Systems & Architecture',
      description: 'Complete 9 credits in systems courses.',
      status: 'pending',
      credits: 9
    }
  ],
  electives: [
    {
      id: 'elec-1',
      title: 'AI Electives',
      description: '6 credits from approved AI electives.',
      status: 'pending',
      credits: 6
    },
    {
      id: 'elec-2',
      title: 'Open Electives',
      description: '12 credits of general electives.',
      status: 'pending',
      credits: 12
    }
  ]
};

export const mockChatResponse = {
  sessionId: 'session-2026-02-24',
  message: {
    id: 'msg-200',
    role: 'assistant' as const,
    content: 'Based on your profile, CS402 and CS455 strengthen your AI track progression.',
    timestamp: new Date().toISOString(),
    sources: ['Degree Audit', 'AI Track Guide'],
    status: 'complete' as const
  }
};
