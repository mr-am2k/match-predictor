import { NavLink, Outlet } from 'react-router-dom';
import { ShieldAlert, Trophy, Gauge, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AdminLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-xl shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">403 &mdash; Admin only</h1>
          <p className="text-sm text-gray-600 mt-2">
            You need administrator privileges to access this area.
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/admin/competitions', label: 'Competitions', icon: Trophy },
    { to: '/admin/budget', label: 'Budget', icon: Gauge },
    { to: '/admin/leagues', label: 'Leagues', icon: Users },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="px-3 py-2 mb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Admin
                </p>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
