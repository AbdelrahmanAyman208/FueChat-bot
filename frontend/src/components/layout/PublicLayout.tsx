import { Outlet, NavLink } from 'react-router-dom';
import Logo from '../common/Logo';
import Button from '../ui/Button';

const PublicLayout = () => {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[rgba(255,255,255,0.92)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <NavLink to="/" aria-label="FueBot home">
            <Logo className="flex" />
          </NavLink>
          <div className="flex items-center gap-2 sm:gap-3">
            <NavLink to="/login">
              <Button className="px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm">Sign in</Button>
            </NavLink>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default PublicLayout;
