import { NavLink, Outlet } from 'react-router-dom';
import { ShieldAlert, Trophy, Gauge, Users, ClipboardEdit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AdminLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-ink-850)]/85 backdrop-blur p-8 text-center animate-fade-up">
          <div
            aria-hidden
            className="mx-auto w-14 h-14 rounded-xl grid place-items-center mb-5 border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/10"
          >
            <ShieldAlert className="w-6 h-6 text-[color:var(--color-loss-500)]" />
          </div>
          <p className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-[color:var(--color-loss-500)] mb-3">
            / 403 · Forbidden
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)]">
            Admin only
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-ink-200)]">
            You need administrator privileges to access this area of the console.
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/admin/competitions', label: 'Competitions', icon: Trophy },
    { to: '/admin/fixtures', label: 'Fixtures', icon: ClipboardEdit },
    { to: '/admin/budget', label: 'Budget', icon: Gauge },
    { to: '/admin/leagues', label: 'Leagues', icon: Users },
  ];

  return (
    <div className="min-h-[calc(100vh-72px)]">
      {/* Mobile tab bar — horizontal scroll */}
      <div className="lg:hidden sticky top-[72px] z-20 bg-[color:var(--color-ink-900)]/90 backdrop-blur-lg border-b border-[color:var(--color-ink-700)]">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-3 -mx-1 px-1 scrollbar-none">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-md font-mono text-[0.7rem] tracking-[0.22em] uppercase transition-colors border ${
                    isActive
                      ? 'text-[color:var(--color-volt-200)] bg-[color:var(--color-volt-200)]/10 border-[color:var(--color-volt-200)]/40'
                      : 'text-[color:var(--color-ink-200)] border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60 hover:text-[color:var(--color-ink-50)] hover:border-[color:var(--color-ink-500)]'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[88rem] mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* Sidebar (lg+) */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-[96px]">
              <div className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur overflow-hidden">
                {/* Wordmark */}
                <div className="px-5 pt-6 pb-5 border-b border-[color:var(--color-ink-700)] relative">
                  <p className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-2">
                    / Control room
                  </p>
                  <h2 className="font-display text-3xl tracking-wide text-[color:var(--color-ink-50)] leading-none">
                    ADMIN<span className="text-[color:var(--color-volt-200)]">/</span>CONSOLE
                  </h2>
                  <div className="mt-3 tick-divider" aria-hidden />
                  <p className="mt-3 font-mono text-[0.58rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-300)] flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--color-win-500)] animate-volt-pulse"
                    />
                    Live · ops
                  </p>
                </div>

                {/* Nav */}
                <nav className="p-2">
                  <ul className="flex flex-col">
                    {navItems.map(({ to, label, icon: Icon }) => (
                      <li key={to}>
                        <NavLink
                          to={to}
                          className={({ isActive }) =>
                            `group relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-lg font-mono text-[0.72rem] tracking-[0.22em] uppercase transition-colors ${
                              isActive
                                ? 'text-[color:var(--color-volt-200)] bg-[color:var(--color-volt-200)]/8'
                                : 'text-[color:var(--color-ink-200)] hover:text-[color:var(--color-ink-50)] hover:bg-[color:var(--color-ink-800)]/70'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                aria-hidden
                                className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full transition-colors ${
                                  isActive
                                    ? 'bg-[color:var(--color-volt-200)]'
                                    : 'bg-transparent group-hover:bg-[color:var(--color-ink-600)]'
                                }`}
                              />
                              <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                              <span className="flex-1">{label}</span>
                              <span
                                aria-hidden
                                className={`font-mono text-[0.6rem] tracking-[0.2em] transition-colors ${
                                  isActive
                                    ? 'text-[color:var(--color-volt-200)]'
                                    : 'text-[color:var(--color-ink-500)] group-hover:text-[color:var(--color-ink-300)]'
                                }`}
                              >
                                →
                              </span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* Footer meta */}
                <div className="px-5 py-4 border-t border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/40">
                  <p className="font-mono text-[0.58rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-400)]">
                    Operator
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--color-ink-50)] truncate">
                    {user?.username ?? 'admin'}
                  </p>
                  <p className="mt-0.5 font-mono text-[0.6rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-300)]">
                    Role · {user?.role ?? 'ADMIN'}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
