import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import PublicLayout from './components/layout/PublicLayout';
import LoginPage from './features/auth/LoginPage';
import ChatPage from './features/chat/ChatPage';
import ProfilePage from './features/profile/ProfilePage';
import RecommendationsPage from './features/recommendations/RecommendationsPage';
import RequirementsPage from './features/requirements/RequirementsPage';
import AdvisorDashboardPage from './features/advisor/AdvisorDashboardPage';
import AdvisorStudentDetailPage from './features/advisor/AdvisorStudentDetailPage';
import ProtectedRoute from './routes/ProtectedRoute';
import NotFound from './components/common/NotFound';
import LandingPage from './features/public/LandingPage';
import PublicRoute from './routes/PublicRoute';

const App = () => {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/requirements" element={<RequirementsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['advisor']} />}>
            <Route path="/advisor/students" element={<AdvisorDashboardPage />} />
            <Route path="/advisor/students/:studentId" element={<AdvisorStudentDetailPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
