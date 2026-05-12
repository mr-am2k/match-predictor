import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, AlertCircle, ArrowRight, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] grid lg:grid-cols-2">
      {/* Left: editorial poster */}
      <aside className="relative hidden lg:block overflow-hidden border-r border-[color:var(--color-ink-700)]">
        <div aria-hidden className="absolute inset-0 stadium-mesh opacity-70" />
        <div
          aria-hidden
          className="absolute -top-40 -left-20 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(215,255,61,0.5), transparent 60%)' }}
        />
        <div className="relative h-full flex flex-col justify-between p-10 xl:p-16">
          <div className="flex items-center gap-3">
            <span className="w-10 h-[2px] bg-[color:var(--color-volt-200)]" />
            <span className="font-mono text-[0.7rem] tracking-[0.3em] text-[color:var(--color-volt-200)] uppercase">
              Matchday · Access
            </span>
          </div>
          <div>
            <h1 className="font-display text-[4.5rem] xl:text-[6rem] leading-[0.85] text-[color:var(--color-ink-50)] tracking-wide">
              Back for
              <br />
              another
              <br />
              <span className="text-[color:var(--color-volt-200)]">round.</span>
            </h1>
            <p className="mt-8 max-w-md text-[color:var(--color-ink-200)] text-base leading-relaxed">
              Sign in to lock your predictions, chase the leaderboard, and
              settle scores with your mates before the next whistle.
            </p>
          </div>
          <div className="flex items-center justify-between font-mono text-[0.65rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-300)]">
            <span>SEASON 25/26</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-win-500)] animate-volt-pulse" />
              Servers live
            </span>
          </div>
        </div>
      </aside>

      {/* Right: form */}
      <div className="flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 mb-8 lg:hidden"
            aria-label="Home"
          >
            <div className="w-9 h-9 rounded-[10px] bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] grid place-items-center">
              <Trophy className="w-[18px] h-[18px]" strokeWidth={2.4} />
            </div>
            <span className="font-display text-xl tracking-[0.08em] text-[color:var(--color-ink-50)]">
              MATCH/<span className="text-[color:var(--color-volt-200)]">PREDICTOR</span>
            </span>
          </Link>

          <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
            / Log in
          </p>
          <h2 className="font-display text-5xl sm:text-6xl tracking-wide text-[color:var(--color-ink-50)] mb-3 lg:hidden">
            Welcome back.
          </h2>
          <h2 className="font-display text-5xl tracking-wide text-[color:var(--color-ink-50)] mb-3 hidden lg:block">
            Access manager.
          </h2>
          <p className="text-[color:var(--color-ink-200)] mb-10">
            Enter your credentials to resume the season.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Username"
              type="text"
              placeholder="your.handle"
              icon={<User />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              icon={<ArrowRight />}
              iconPosition="right"
            >
              Enter
            </Button>

            <div className="relative flex items-center my-2">
              <div className="flex-1 tick-divider" />
              <span className="px-3 font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-400)]">
                New here
              </span>
              <div className="flex-1 tick-divider" />
            </div>

            <Link
              to="/register"
              className="block w-full text-center py-3 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60 text-[color:var(--color-ink-100)] font-mono text-[0.72rem] tracking-[0.22em] uppercase hover:border-[color:var(--color-volt-200)]/50 hover:text-[color:var(--color-volt-200)] transition-colors"
            >
              Create a manager account →
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
