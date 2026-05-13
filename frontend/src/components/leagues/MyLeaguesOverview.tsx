import { AlertCircle, ArrowRight, Globe, Lock, Plus, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyLeagues } from '../../api/leagues';
import type { LeagueSummary } from '../../types/league';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';

export function MyLeaguesOverview() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMyLeagues()
      .then((data) => {
        if (cancelled) return;
        setLeagues(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load leagues');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.25em] uppercase text-[color:var(--color-volt-200)] mb-2">
              / Your leagues
            </p>
            <h2 className="font-display text-2xl sm:text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
              Your boards
            </h2>
          </div>
          <Link to="/leagues/new">
            <Button size="sm" icon={<Plus />}>
              New league
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        )}

        {!error && !isLoading && leagues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/40">
            <div className="w-14 h-14 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)] grid place-items-center mb-5">
              <Trophy className="w-6 h-6 text-[color:var(--color-ink-400)]" />
            </div>
            <p className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-400)] mb-2">
              / Empty table
            </p>
            <h3 className="font-display text-2xl tracking-wide uppercase text-[color:var(--color-ink-50)] mb-2">
              No leagues yet
            </h3>
            <p className="text-sm text-[color:var(--color-ink-200)] max-w-sm mb-6">
              Create your first prediction league and invite friends to compete.
            </p>
            <Link to="/leagues/new">
              <Button icon={<Plus />}>Create your first league</Button>
            </Link>
          </div>
        )}

        {!error && !isLoading && leagues.length > 0 && (
          <ul className="space-y-2 stagger">
            {leagues.map((league) => (
              <li key={league.id}>
                <Link
                  to={`/leagues/${league.id}`}
                  className="group flex items-center gap-4 p-3.5 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/50 hover:bg-[color:var(--color-ink-800)] hover:border-[color:var(--color-ink-600)] transition-colors"
                >
                  {league.competition.logoUrl ? (
                    <img
                      src={league.competition.logoUrl}
                      alt=""
                      className="w-10 h-10 object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg tracking-wide uppercase text-[color:var(--color-ink-50)] truncate">
                      {league.name}
                    </div>
                    <div className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] truncate mt-0.5">
                      {league.competition.name} · S{league.competition.seasonYear}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="hidden sm:inline-flex items-center gap-1.5 font-mono tabular-nums text-xs text-[color:var(--color-ink-300)]"
                      title={`${league.memberCount} members`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {league.memberCount}
                    </span>
                    <span
                      className="hidden sm:inline-flex items-center gap-1 font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] px-2 py-1 rounded-md border border-[color:var(--color-ink-700)]"
                      title={league.visibility}
                    >
                      {league.visibility === 'PRIVATE' ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Globe className="w-3 h-3" />
                      )}
                      {league.visibility}
                    </span>
                    {league.role === 'OWNER' && (
                      <span className="chip chip-volt">Owner</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[color:var(--color-ink-400)] group-hover:text-[color:var(--color-volt-200)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
