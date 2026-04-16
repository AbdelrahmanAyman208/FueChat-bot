import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { UserRole } from '../types/global';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, status } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // Still loading auth state — show nothing while checking session
  if (status === 'loading') {
    return null;
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/chat" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
