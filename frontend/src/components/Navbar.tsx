import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  LogOut,
  LayoutDashboard,
  Shield,
  Menu,
  X,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  const BrandMark = () => (
    <Link to="/" className="flex items-center gap-2.5 group" aria-label="Match Predictor home">
      <div className="relative">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center
          bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)]
          shadow-[0_0_0_1px_rgba(215,255,61,0.25),0_0_24px_-4px_rgba(215,255,61,0.55)]
          transition-transform duration-200 group-hover:rotate-[-4deg]"
        >
          <Trophy className="w-[18px] h-[18px]" strokeWidth={2.4} />
        </div>
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[color:var(--color-win-500)] ring-2 ring-[color:var(--color-ink-900)] animate-volt-pulse"
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-xl tracking-[0.08em] text-[color:var(--color-ink-50)]">
          MATCH/<span className="text-[color:var(--color-volt-200)]">PREDICTOR</span>
        </span>
        <span className="text-[0.58rem] font-mono tracking-[0.3em] text-[color:var(--color-ink-300)] mt-0.5 hidden sm:block">
          PREDICT · COMPETE · CONQUER
        </span>
      </div>
    </Link>
  );

  const primaryNav = isAuthenticated
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/leagues/browse', label: 'Browse' },
        { to: '/leagues/new', label: 'Create league' },
      ]
    : [];

  return (
    <>
      <nav
        className={`sticky top-0 z-40 transition-[background-color,backdrop-filter,border-color] duration-200
          ${scrolled
            ? 'bg-[color:var(--color-ink-900)]/85 backdrop-blur-lg border-b border-[color:var(--color-ink-700)]'
            : 'bg-transparent border-b border-transparent'}
        `}
      >
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex justify-between items-center h-[72px]">
            <BrandMark />

            {/* Desktop primary nav */}
            <div className="hidden lg:flex items-center gap-1 font-mono text-[0.7rem] tracking-[0.18em] uppercase">
              {primaryNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'text-[color:var(--color-volt-200)] bg-[color:var(--color-volt-200)]/8'
                        : 'text-[color:var(--color-ink-200)] hover:text-[color:var(--color-ink-50)] hover:bg-[color:var(--color-ink-800)]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin/competitions">
                      <Button variant="ghost" size="sm" icon={<Shield />}>
                        Admin
                      </Button>
                    </Link>
                  )}
                  <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/50">
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[color:var(--color-volt-200)] to-[color:var(--color-volt-300)] text-[color:var(--color-ink-950)] grid place-items-center text-[0.7rem] font-bold">
                      {initials}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[0.65rem] font-mono tracking-[0.15em] text-[color:var(--color-ink-300)] uppercase">
                        Manager
                      </span>
                      <span className="text-xs font-semibold text-[color:var(--color-ink-50)]">
                        {user?.username}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout} icon={<LogOut />}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" icon={<LogIn />}>
                      Login
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="primary" size="sm" icon={<UserPlus />}>
                      Sign up
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="md:hidden relative w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/80 text-[color:var(--color-ink-100)] hover:border-[color:var(--color-ink-500)] transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile panel */}
      <div
        className={`md:hidden fixed inset-0 z-30 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-[color:var(--color-ink-950)]/75 backdrop-blur-md"
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute top-[72px] inset-x-0 bg-[color:var(--color-ink-900)] border-b border-[color:var(--color-ink-700)] shadow-2xl transition-transform duration-300 ease-out ${
            open ? 'translate-y-0' : '-translate-y-4'
          }`}
        >
          <div className="p-5 pb-8 flex flex-col gap-1">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[color:var(--color-ink-800)]/80 border border-[color:var(--color-ink-700)] mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[color:var(--color-volt-200)] to-[color:var(--color-volt-300)] text-[color:var(--color-ink-950)] grid place-items-center text-sm font-bold">
                    {initials}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[0.62rem] font-mono tracking-[0.18em] uppercase text-[color:var(--color-ink-300)]">
                      Signed in as
                    </span>
                    <span className="text-sm font-semibold text-[color:var(--color-ink-50)]">
                      {user?.username}
                    </span>
                  </div>
                </div>
                {[
                  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { to: '/leagues/browse', label: 'Browse leagues', icon: Trophy },
                  { to: '/leagues/new', label: 'Create league', icon: UserPlus },
                ].map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-3 rounded-lg font-mono text-[0.75rem] tracking-[0.18em] uppercase transition-colors ${
                        isActive
                          ? 'text-[color:var(--color-volt-200)] bg-[color:var(--color-volt-200)]/10'
                          : 'text-[color:var(--color-ink-100)] hover:bg-[color:var(--color-ink-800)]'
                      }`
                    }
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    <span aria-hidden className="text-[color:var(--color-ink-400)]">→</span>
                  </NavLink>
                ))}
                {user?.role === 'ADMIN' && (
                  <NavLink
                    to="/admin/competitions"
                    className="flex items-center justify-between px-3 py-3 rounded-lg font-mono text-[0.75rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-100)] hover:bg-[color:var(--color-ink-800)]"
                  >
                    <span className="inline-flex items-center gap-3">
                      <Shield className="w-4 h-4" />
                      Admin console
                    </span>
                    <span aria-hidden className="text-[color:var(--color-ink-400)]">→</span>
                  </NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="mt-2 flex items-center justify-between px-3 py-3 rounded-lg font-mono text-[0.75rem] tracking-[0.18em] uppercase text-[color:var(--color-loss-500)] hover:bg-[color:var(--color-loss-500)]/10"
                >
                  <span className="inline-flex items-center gap-3">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                <Link to="/login" className="w-full">
                  <Button variant="outline" size="lg" className="w-full" icon={<LogIn />}>
                    Login
                  </Button>
                </Link>
                <Link to="/register" className="w-full">
                  <Button variant="primary" size="lg" className="w-full" icon={<UserPlus />}>
                    Create account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
