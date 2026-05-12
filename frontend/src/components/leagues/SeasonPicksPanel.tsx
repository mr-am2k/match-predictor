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
            <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-600" />
              Season picks
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Pick the competition winner, top goalscorer, and top assister before
              the season starts.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : prediction ? (
          <>
            {prediction.locked ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                Picks closed when the season started
                {prediction.locksAt
                  ? ` on ${formatLockDate(prediction.locksAt)}`
                  : ''}
                . Season picks will score when the season ends.
              </div>
            ) : prediction.locksAt ? (
              <div className="text-sm text-gray-600">
                Picks lock on{' '}
                <span className="font-medium text-gray-900">
                  {formatLockDate(prediction.locksAt)}
                </span>
                .
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
                  icon={<ChevronRight className="w-4 h-4" />}
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
  return (
    <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm font-medium ${
          value ? 'text-gray-900' : 'text-gray-400 italic'
        }`}
      >
        {value ?? 'No pick'}
      </dd>
    </div>
  );
}
