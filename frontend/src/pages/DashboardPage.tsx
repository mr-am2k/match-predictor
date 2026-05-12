import { Calendar, LogOut, Plus, Search, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { MyLeaguesOverview } from '../components/leagues/MyLeaguesOverview';

const stats = [
  { label: 'Total predictions', value: '0', kicker: '/ 01', icon: Target },
  { label: 'Correct calls', value: '0', kicker: '/ 02', icon: TrendingUp },
  { label: 'Upcoming matches', value: '0', kicker: '/ 03', icon: Calendar },
];

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const firstName = user?.username ?? 'Manager';

  return (
    <div className="min-h-[calc(100vh-72px)]">
      <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        {/* ===== HERO / WELCOME ===== */}
        <section className="relative overflow-hidden rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/80 backdrop-blur-[6px] mb-10 animate-fade-up">
          <div aria-hidden className="absolute inset-0 stadium-mesh opacity-60 [mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_70%)]" />
          <div aria-hidden className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[color:var(--color-volt-200)]/12 blur-3xl" />
          <div className="relative grid lg:grid-cols-12 gap-8 p-6 sm:p-10 lg:p-14 items-end">
            <div className="lg:col-span-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-[2px] bg-[color:var(--color-volt-200)]" />
                <p className="font-mono text-[0.68rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)]">
                  / Dashboard · Matchday
                </p>
                <span className="chip chip-win">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-win-500)] animate-volt-pulse" />
                  Online
                </span>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
                Welcome back,
                <br />
                <span className="text-[color:var(--color-volt-200)]">{firstName}.</span>
              </h1>
              <p className="mt-5 text-[color:var(--color-ink-200)] max-w-lg text-base leading-relaxed">
                Your prediction command center. Track your leagues, scout the fixture list, and lock in calls before kickoff.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/leagues/new">
                  <Button icon={<Plus />}>Create league</Button>
                </Link>
                <Link to="/leagues/browse">
                  <Button variant="outline" icon={<Search />}>
                    Browse public leagues
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleLogout} icon={<LogOut />}>
                  Sign out
                </Button>
              </div>
            </div>

            {/* Identity panel */}
            <div className="lg:col-span-4">
              <div className="relative rounded-2xl border border-[color:var(--color-volt-200)]/30 bg-[color:var(--color-ink-900)]/80 p-6 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[color:var(--color-volt-200)] to-transparent" />
                <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)] mb-4">
                  / Manager ID
                </p>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[color:var(--color-volt-200)] to-[color:var(--color-volt-300)] text-[color:var(--color-ink-950)] grid place-items-center font-display text-2xl tracking-wide shadow-[0_0_0_1px_rgba(215,255,61,0.25),0_0_24px_-4px_rgba(215,255,61,0.55)]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-2xl tracking-wide uppercase text-[color:var(--color-ink-50)] truncate">
                      {user?.username}
                    </p>
                    <p className="font-mono text-xs text-[color:var(--color-ink-300)] truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <div className="tick-divider my-4" />
                <dl className="space-y-2">
                  <div className="flex items-center justify-between">
                    <dt className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                      Role
                    </dt>
                    <dd className="chip chip-volt">{user?.role ?? 'USER'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                      Status
                    </dt>
                    <dd className="font-mono tabular-nums text-sm text-[color:var(--color-volt-200)]">
                      Live
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ===== STATS ROW ===== */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <p className="font-mono text-[0.68rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)]">
              / Scorecard
            </p>
            <span className="h-[1px] flex-1 bg-[color:var(--color-ink-700)]" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/70 p-6 transition-colors hover:border-[color:var(--color-ink-500)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="font-mono text-[0.65rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-400)]">
                    {stat.kicker}
                  </span>
                  <div className="w-10 h-10 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)] grid place-items-center text-[color:var(--color-ink-200)] transition-all duration-300 group-hover:border-[color:var(--color-volt-200)]/60 group-hover:text-[color:var(--color-volt-200)]">
                    <stat.icon className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                </div>
                <p className="scoreboard text-5xl sm:text-6xl text-[color:var(--color-ink-50)] leading-none">
                  {stat.value}
                </p>
                <p className="mt-3 font-mono text-[0.7rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                  {stat.label}
                </p>
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[color:var(--color-volt-200)] transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>
        </section>

        {/* ===== LEAGUES ===== */}
        <section>
          <MyLeaguesOverview />
        </section>
      </div>
    </div>
  );
}
