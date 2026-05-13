import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { joinLeagueByCode } from '../api/leagues';
import { Button } from '../components/ui/Button';
import type { League } from '../types/league';

export function JoinLeagueByCodePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [league, setLeague] = useState<League | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setError('No join code provided.');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    joinLeagueByCode(code)
      .then((data) => {
        if (cancelled) return;
        setLeague(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to join league');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[color:var(--color-volt-200)] animate-spin" />
          <div className="text-center">
            <p className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-2">
              / Redeeming code
            </p>
            <p className="font-display text-2xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
              Joining league...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)]">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-10 py-14">
        {error || !league ? (
          <div className="animate-fade-up relative overflow-hidden rounded-2xl border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-ink-850)]/80 p-8 sm:p-10">
            <div aria-hidden className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[color:var(--color-loss-500)]/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-5 font-mono text-[0.62rem] tracking-[0.28em] uppercase text-[color:var(--color-loss-500)]">
                <AlertCircle className="w-3.5 h-3.5" />
                / Denied
              </div>
              <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
                Could not join
                <br />
                <span className="text-[color:var(--color-loss-500)]">league.</span>
              </h1>
              <p className="mt-5 text-sm text-[color:var(--color-ink-200)]">
                {error ?? 'The join code may be invalid or expired.'}
              </p>
              <div className="mt-8">
                <Link to="/dashboard">
                  <Button variant="outline" icon={<ArrowLeft />}>
                    Back to dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-up relative overflow-hidden rounded-2xl border border-[color:var(--color-volt-200)]/40 bg-[color:var(--color-ink-850)]/80 p-8 sm:p-10">
            <div aria-hidden className="absolute inset-0 stadium-mesh opacity-50 [mask-image:radial-gradient(ellipse_at_top_right,black_20%,transparent_80%)]" />
            <div aria-hidden className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[color:var(--color-volt-200)]/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-5 chip chip-win">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                You're in
              </div>
              <p className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
                / Joined
              </p>
              <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9] break-words">
                {league.name}
              </h1>

              <div className="mt-8 p-4 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/60 flex items-center gap-3">
                {league.competition.logoUrl && (
                  <img
                    src={league.competition.logoUrl}
                    alt=""
                    className="w-10 h-10 object-contain flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-display text-base tracking-wide uppercase text-[color:var(--color-ink-50)] truncate">
                    {league.competition.name}
                  </p>
                  <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-volt-200)] mt-0.5">
                    Season {league.competition.seasonYear}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate(`/leagues/${league.id}`)}
                  icon={<ArrowRight />}
                  iconPosition="right"
                  size="lg"
                >
                  Go to league
                </Button>
                <Link to="/dashboard">
                  <Button variant="outline" size="lg">
                    Back to dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
