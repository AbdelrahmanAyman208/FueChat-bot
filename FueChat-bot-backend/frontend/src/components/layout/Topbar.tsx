import { useNavigate, NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import Button from '../ui/Button';
import { logout } from '../../features/auth/authSlice';
import Logo from '../common/Logo';

const Topbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { label: 'Chat', to: '/chat', roles: ['student', 'advisor', 'admin'] },
    { label: 'Profile', to: '/profile', roles: ['student', 'advisor', 'admin'] },
    { label: 'Recommendations', to: '/recommendations', roles: ['student'] },
    { label: 'Requirements', to: '/requirements', roles: ['student'] },
    { label: 'My Students', to: '/advisor/students', roles: ['advisor'] },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Logo className="flex" />
        <nav className="order-3 w-full overflow-x-auto pb-1 md:order-2 md:w-auto no-scrollbar">
          <div className="flex w-max items-center gap-2">
          {navItems
            .filter((item) => (user?.role ? item.roles.includes(user.role) : true))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'pill-tab pill-tab-active whitespace-nowrap' : 'pill-tab whitespace-nowrap')}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 md:order-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-muted">Role</p>
            <p className="text-sm font-semibold capitalize">{user?.role ?? 'student'}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout} className="px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
