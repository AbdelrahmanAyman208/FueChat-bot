import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();

  // If already logged in (session cookie valid), redirect to chat
  if (user) {
    return <Navigate to="/chat" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default PublicRoute;
