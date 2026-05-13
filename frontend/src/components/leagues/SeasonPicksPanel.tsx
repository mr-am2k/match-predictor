import { AlertCircle, ChevronRight, Loader2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getOverallPrediction,
  listPlayers,
  listTeams,
} from '../../api/overall';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import type { OverallPrediction } from '../../types/overall';
import type { PlayerSummary, TeamSummary } from '../../types/prediction';

interface SeasonPicksPanelProps {
  leagueId: string;
}

function formatLockDate(locksAt: string | null): string {
  if (!locksAt) return '';
  const [year, month, day] = locksAt.split('-').map(Number);
  if (!year || !month || !day) return locksAt;
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function SeasonPicksPanel({ leagueId }: SeasonPicksPanelProps) {
  const [prediction, setPrediction] = useState<OverallPrediction | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getOverallPrediction(leagueId),
      listTeams(leagueId),
      listPlayers(leagueId),
    ])
      .then(([predictionData, teamsData, playersData]) => {
        if (cancelled) return;
        setPrediction(predictionData);
        setTeams(teamsData);
        setPlayers(playersData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load season picks'
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const winnerName =
    prediction?.winnerTeamId != null
      ? (teams.find((t) => t.id === prediction.winnerTeamId)?.name ?? null)
      : null;
  const topScorerName =
    prediction?.topScorerPlayerId != null
      ? (players.find((p) => p.playerId === prediction.topScorerPlayerId)
          ?.name ?? null)
      : null;
  const topAssisterName =
    prediction?.topAssisterPlayerId != null
      ? (players.find((p) => p.playerId === prediction.topAssisterPlayerId)
          ?.name ?? null)
      : null;

  const hasAnyPick =
    prediction !== null &&
    (prediction.winnerTeamId !== null ||
      prediction.topScorerPlayerId !== null ||
      prediction.topAssisterPlayerId !== null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.25em] uppercase text-[color:var(--color-volt-200)] mb-2 inline-flex items-center gap-2">
              <Star className="w-3 h-3" strokeWidth={2.5} />
              / Season picks
            </p>
            <h2 className="font-display text-2xl sm:text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
              Call the season
            </h2>
            <p className="text-sm text-[color:var(--color-ink-200)] mt-1 max-w-lg">
              Pick the competition winner, top goalscorer, and top assister before the season starts.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-[color:var(--color-volt-200)] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : prediction ? (
          <>
            {prediction.locked ? (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8">
                <div className="w-1 h-full self-stretch bg-[color:var(--color-loss-500)] rounded-full" />
                <div className="text-sm text-[color:var(--color-ink-100)]">
                  <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-loss-500)] mb-1">
                    Picks locked
                  </p>
                  Closed when the season started
                  {prediction.locksAt ? ` on ${formatLockDate(prediction.locksAt)}` : ''}. Season picks
                  will score when the season ends.
                </div>
              </div>
            ) : prediction.locksAt ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/50">
                <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                  Lock date
                </p>
                <p className="font-mono tabular-nums text-sm text-[color:var(--color-volt-200)]">
                  {formatLockDate(prediction.locksAt)}
                </p>
              </div>
            ) : null}

            <dl className="grid gap-3 sm:grid-cols-3">
              <PickCell label="Winner" value={winnerName} />
              <PickCell label="Top scorer" value={topScorerName} />
              <PickCell label="Top assister" value={topAssisterName} />
            </dl>

            <div className="pt-1">
              <Link to={`/leagues/${leagueId}/overall-prediction`}>
                <Button
                  icon={<ChevronRight />}
                  iconPosition="right"
                  variant={prediction.locked ? 'outline' : 'primary'}
                >
                  {prediction.locked
                    ? 'View season picks'
                    : hasAnyPick
                      ? 'Edit season picks'
                      : 'Make your picks'}
                </Button>
              </Link>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface PickCellProps {
  label: string;
  value: string | null;
}

function PickCell({ label, value }: PickCellProps) {
  const hasValue = Boolean(value);
  return (
    <div
      className={`relative rounded-xl border p-4 overflow-hidden transition-colors ${
        hasValue
          ? 'border-[color:var(--color-volt-200)]/30 bg-[color:var(--color-volt-200)]/5'
          : 'border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60'
      }`}
    >
      <dt className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
        {label}
      </dt>
      <dd
        className={`mt-2 font-display text-xl tracking-wide uppercase truncate ${
          hasValue ? 'text-[color:var(--color-ink-50)]' : 'text-[color:var(--color-ink-500)]'
        }`}
      >
        {value ?? 'No pick'}
      </dd>
    </div>
  );
}
