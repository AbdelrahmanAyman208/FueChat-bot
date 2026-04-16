import { Link } from 'react-router-dom';
import Card from '../ui/Card';

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center px-6 login-wrap">
    <div className="page-bg" />
    <div className="page-bg page-bg-2" />
    <div className="page-grid" />
    <Card className="relative z-10 p-8 text-center space-y-4 max-w-lg">
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-sm text-muted">The page you requested does not exist in FueBot.</p>
      <Link
        to="/chat"
        className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-soft"
      >
        Return to dashboard
      </Link>
    </Card>
  </div>
);

export default NotFound;
