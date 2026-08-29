import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileSearch,
  FolderKanban,
  LogOut,
  SlidersHorizontal,
  Network,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/auth';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/analyze', label: 'Analyze', icon: FileSearch },
  { to: '/cases', label: 'Cases', icon: FolderKanban },
  { to: '/campaigns', label: 'Campaigns', icon: Network },
  { to: '/rules', label: 'Rules', icon: SlidersHorizontal }
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-950 lg:flex">
      <aside className="border-b border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-950 text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-normal">MailSentinel</h1>
              <p className="text-xs font-medium uppercase text-gray-500">Forensic Console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 w-10 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 lg:hidden"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex min-w-max items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-gray-950 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                ].join(' ')
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-gray-200 p-4 lg:block">
          <div className="mb-3 rounded bg-gray-50 p-3">
            <p className="truncate text-sm font-semibold text-gray-900">{user?.username}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      <main className="min-h-screen flex-1 p-4 sm:p-6 lg:ml-72 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
