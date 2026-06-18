import { AlertCircle, Loader2, Lock, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScoringRules } from '../../api/scoringRules';
import { useAuth } from '../../context/AuthContext';
import type { League } from '../../types/league';
import type { LeagueScoringRulesResponse } from '../../types/scoring';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { ScoringRulesTable } from './ScoringRulesTable';

interface ScoringRulesCardProps {
  league: League;
}

export function ScoringRulesCard({ league }: ScoringRulesCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user !== null && league.owner.id === user.id;
  const isAdmin = user !== null && user.role === 'ADMIN';

  const [rules, setRules] = useState<LeagueScoringRulesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getScoringRules(league.id)
      .then((data) => {
        if (cancelled) return;
        setRules(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load scoring rules');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [league.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.25em] uppercase text-[color:var(--color-volt-200)] mb-2">
              / Scoring engine
            </p>
            <h2 className="font-display text-2xl sm:text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
              Rules of the game
            </h2>
            <p className="text-sm text-[color:var(--color-ink-200)] mt-1">
              How points are awarded in this league.
            </p>
          </div>

          {rules && ((isOwner && rules.editable) || isAdmin) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/leagues/${league.id}/scoring-rules/edit`)}
              icon={<Pencil />}
            >
              Edit
            </Button>
          )}

          {isOwner && !isAdmin && rules && !rules.editable && (
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Scoring rules are locked once predictions are submitted."
              icon={<Lock />}
            >
              Locked
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-[color:var(--color-ink-300)]">
            <Loader2 className="w-5 h-5 animate-spin text-[color:var(--color-volt-200)]" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && rules && (
          <ScoringRulesTable
            value={rules}
            onChange={() => {
              /* read-only */
            }}
            readOnly
          />
        )}
      </CardContent>
    </Card>
  );
}
