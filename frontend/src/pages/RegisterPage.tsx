import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, ArrowRight, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      await register({ email, username, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
          className="absolute -bottom-40 -right-20 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(215,255,61,0.5), transparent 60%)' }}
        />
        <div className="relative h-full flex flex-col justify-between p-10 xl:p-16">
          <div className="flex items-center gap-3">
            <span className="w-10 h-[2px] bg-[color:var(--color-volt-200)]" />
            <span className="font-mono text-[0.7rem] tracking-[0.3em] text-[color:var(--color-volt-200)] uppercase">
              Draft · Manager
            </span>
          </div>
          <div>
            <h1 className="font-display text-[4.5rem] xl:text-[6rem] leading-[0.85] text-[color:var(--color-ink-50)] tracking-wide">
              Claim
              <br />
              your
              <br />
              <span className="text-[color:var(--color-volt-200)]">dugout.</span>
            </h1>
            <p className="mt-8 max-w-md text-[color:var(--color-ink-200)] text-base leading-relaxed">
              Free forever. Build private leagues, chase season-long calls, and
              make your mates regret every take they had at the pub.
            </p>
          </div>
          <ul className="space-y-2 font-mono text-[0.7rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-200)]">
            {['Unlimited leagues', 'No ads, no paywalls', 'Your picks, your receipts'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="w-2 h-2 rotate-45 bg-[color:var(--color-volt-200)]" />
                {t}
              </li>
            ))}
          </ul>
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
            / Sign up
          </p>
          <h2 className="font-display text-5xl sm:text-6xl tracking-wide text-[color:var(--color-ink-50)] mb-3">
            New manager.
          </h2>
          <p className="text-[color:var(--color-ink-200)] mb-10">
            Pick a handle. Build a dynasty.
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
              label="Email"
              type="email"
              placeholder="you@club.com"
              icon={<Mail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
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
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                hint="Min. 6 characters"
              />
              <Input
                label="Confirm"
                type="password"
                placeholder="••••••••"
                icon={<Lock />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              icon={<ArrowRight />}
              iconPosition="right"
            >
              Create account
            </Button>

            <p className="text-center text-sm text-[color:var(--color-ink-300)]">
              Already a manager?{' '}
              <Link
                to="/login"
                className="font-semibold text-[color:var(--color-volt-200)] hover:underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
