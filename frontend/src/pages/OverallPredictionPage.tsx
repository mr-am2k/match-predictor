import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  Save,
  Star,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLeague } from '../api/leagues';
import {
  getOverallPrediction,
  listPlayers,
  listTeams,
  OVERALL_LOCKED_MESSAGE,
  upsertOverallPrediction,
} from '../api/overall';
import { LockCountdown } from '../components/predictions/LockCountdown';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import type { League } from '../types/league';
import type {
  OverallPrediction,
  UpsertOverallPrediction,
} from '../types/overall';
import type { PlayerSummary, TeamSummary } from '../types/prediction';

function formatLockDate(locksAt: string | null): string {
  if (!locksAt) return '';
  // Backend sends LocalDate as "YYYY-MM-DD"; parse manually to avoid TZ surprises.
  const [year, month, day] = locksAt.split('-').map(Number);
  if (!year || !month || !day) return locksAt;
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function toCountdownIso(locksAt: string | null): string | null {
  if (!locksAt) return null;
  // LocalDate → datetime string LockCountdown can parse.
  return `${locksAt}T00:00:00Z`;
}

export function OverallPredictionPage() {
  const { id } = useParams<{ id: string }>();

  const [league, setLeague] = useState<League | null>(null);
  const [prediction, setPrediction] = useState<OverallPrediction | null>(null);
  const [teams, setTeams] = useState<TeamSummary[] | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [winnerTeamId, setWinnerTeamId] = useState<number | null>(null);
  const [topScorerPlayerId, setTopScorerPlayerId] = useState<number | null>(
    null
  );
  const [topAssisterPlayerId, setTopAssisterPlayerId] = useState<number | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [locallyLocked, setLocallyLocked] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      getLeague(id),
      getOverallPrediction(id),
      listTeams(id),
      listPlayers(id),
    ])
      .then(([leagueData, predictionData, teamsData, playersData]) => {
        if (cancelled) return;
        setLeague(leagueData);
        setPrediction(predictionData);
        setTeams(teamsData);
        setPlayers(playersData);
        setWinnerTeamId(predictionData.winnerTeamId);
        setTopScorerPlayerId(predictionData.topScorerPlayerId);
        setTopAssisterPlayerId(predictionData.topAssisterPlayerId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load season picks'
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const sortedTeams = useMemo(() => {
    if (!teams) return [];
    return [...teams].sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  const selectedTeam = useMemo(
    () => sortedTeams.find((t) => t.id === winnerTeamId) ?? null,
    [sortedTeams, winnerTeamId]
  );

  const locked = (prediction?.locked ?? false) || locallyLocked;

  const handleSave = useCallback(async () => {
    if (!id || locked) return;
    setSaving(true);
    setSaveError(null);
    setSavedFlash(false);
    const body: UpsertOverallPrediction = {
      winnerTeamId,
      topScorerPlayerId,
      topAssisterPlayerId,
    };
    try {
      const updated = await upsertOverallPrediction(id, body);
      setPrediction(updated);
      setWinnerTeamId(updated.winnerTeamId);
      setTopScorerPlayerId(updated.topScorerPlayerId);
      setTopAssisterPlayerId(updated.topAssisterPlayerId);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save picks';
      setSaveError(message);
      if (message === OVERALL_LOCKED_MESSAGE) {
        setLocallyLocked(true);
      }
    } finally {
      setSaving(false);
    }
  }, [id, locked, winnerTeamId, topScorerPlayerId, topAssisterPlayerId]);

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (loadError || !league || !prediction) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{loadError ?? 'Season picks unavailable'}</span>
          </div>
          <div className="mt-4">
            <Link to={`/leagues/${id}`}>
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to league
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const emptyTeams = sortedTeams.length === 0;
  const emptyPlayers = sortedPlayers.length === 0;
  const countdownIso = toCountdownIso(prediction.locksAt);
  const showCountdown = !locked && countdownIso !== null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to={`/leagues/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to league
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
            <Star className="w-6 h-6 text-indigo-600" />
            Season picks for {league.name}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {league.competition.name} · Season {league.competition.seasonYear}
          </p>
        </div>

        {showCountdown && (
          <div className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-700">
              Picks lock when the season starts
              {prediction.locksAt ? ` (${formatLockDate(prediction.locksAt)})` : ''}
              .
            </div>
            <LockCountdown locksAt={countdownIso!} />
          </div>
        )}

        {locked && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Picks closed when the season started
              {prediction.locksAt
                ? ` on ${formatLockDate(prediction.locksAt)}`
                : ''}
              . Season picks will score when the season ends.
            </span>
          </div>
        )}

        {(emptyTeams || emptyPlayers) && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            {emptyTeams && emptyPlayers
              ? 'Teams and players for this competition haven’t been synced yet. Check back shortly.'
              : emptyTeams
                ? 'Teams for this competition haven’t been synced yet. Check back shortly.'
                : 'Players for this competition haven’t been synced yet. Check back shortly.'}
          </div>
        )}

        {/* Picker: winner */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Competition winner
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Who will lift the trophy?
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {selectedTeam?.logoUrl ? (
                <img
                  src={selectedTeam.logoUrl}
                  alt=""
                  className="w-8 h-8 object-contain flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 flex-shrink-0" />
              )}
              <select
                value={winnerTeamId ?? ''}
                onChange={(e) =>
                  setWinnerTeamId(
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                disabled={locked || emptyTeams}
                className="flex-1 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 focus:outline-none py-2.5 px-3 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <option value="">Select a team…</option>
                {sortedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWinnerTeamId(null)}
                disabled={locked || winnerTeamId === null}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Picker: top scorer */}
        <PlayerPickerCard
          title="Top goalscorer"
          subtitle="Who will score the most goals?"
          players={sortedPlayers}
          value={topScorerPlayerId}
          onChange={setTopScorerPlayerId}
          disabled={locked || emptyPlayers}
        />

        {/* Picker: top assister */}
        <PlayerPickerCard
          title="Top assister"
          subtitle="Who will provide the most assists?"
          players={sortedPlayers}
          value={topAssisterPlayerId}
          onChange={setTopAssisterPlayerId}
          disabled={locked || emptyPlayers}
        />

        {saveError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {savedFlash && !saveError && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>Season picks saved.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={handleSave}
            disabled={locked || saving}
            isLoading={saving}
            icon={<Save className="w-4 h-4" />}
          >
            Save picks
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PlayerPickerCardProps {
  title: string;
  subtitle: string;
  players: PlayerSummary[];
  value: number | null;
  onChange: (value: number | null) => void;
  disabled: boolean;
}

function PlayerPickerCard({
  title,
  subtitle,
  players,
  value,
  onChange,
  disabled,
}: PlayerPickerCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <select
            value={value ?? ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : Number(e.target.value))
            }
            disabled={disabled}
            className="flex-1 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 focus:outline-none py-2.5 px-3 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <option value="">Select a player…</option>
            {players.map((player) => (
              <option key={player.playerId} value={player.playerId}>
                {player.position
                  ? `${player.name} · ${player.position}`
                  : player.name}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            disabled={disabled || value === null}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
