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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scoring rules</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              How points are awarded in this league.
            </p>
          </div>

          {isOwner && rules && rules.editable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/leagues/${league.id}/scoring-rules/edit`)}
              icon={<Pencil className="w-4 h-4" />}
            >
              Edit
            </Button>
          )}

          {isOwner && rules && !rules.editable && (
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Scoring rules are locked once predictions are submitted."
              icon={<Lock className="w-4 h-4" />}
            >
              Locked (predictions submitted)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
