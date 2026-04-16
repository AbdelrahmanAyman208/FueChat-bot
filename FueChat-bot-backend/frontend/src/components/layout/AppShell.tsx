import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';

const AppShell = () => {
  return (
    <div className="app-shell">
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-[90rem]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
