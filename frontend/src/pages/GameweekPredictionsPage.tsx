import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGameweekFixtures, listGameweeks } from '../api/fixtures';
import { getLeague } from '../api/leagues';
import { GameweekPicker } from '../components/predictions/GameweekPicker';
import { LockCountdown } from '../components/predictions/LockCountdown';
import { MatchPredictionCard } from '../components/predictions/MatchPredictionCard';
import { MatchPredictionModal } from '../components/predictions/MatchPredictionModal';
import { Button } from '../components/ui/Button';
import type { League } from '../types/league';
import type {
  FixtureWithPrediction,
  GameweekFixtures,
  GameweekSummary,
  MyPrediction,
} from '../types/prediction';

function pickDefaultRound(gameweeks: GameweekSummary[]): string | null {
  if (gameweeks.length === 0) return null;
  const open = gameweeks.filter((gw) => gw.status === 'OPEN');
  if (open.length > 0) {
    const sorted = [...open].sort((a, b) => {
      // Gameweeks with a pending lock come first, ordered by locksAt; those with
      // no pending fixture (locksAt = null) fall to the end.
      const aMs = a.locksAt ? new Date(a.locksAt).getTime() : Number.POSITIVE_INFINITY;
      const bMs = b.locksAt ? new Date(b.locksAt).getTime() : Number.POSITIVE_INFINITY;
      return aMs - bMs;
    });
    return sorted[0].round;
  }
  return gameweeks[0].round;
}

export function GameweekPredictionsPage() {
  const { id } = useParams<{ id: string }>();

  const [league, setLeague] = useState<League | null>(null);
  const [leagueError, setLeagueError] = useState<string | null>(null);

  const [gameweeks, setGameweeks] = useState<GameweekSummary[] | null>(null);
  const [gameweeksError, setGameweeksError] = useState<string | null>(null);
  const [gameweeksLoading, setGameweeksLoading] = useState(true);

  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const [fixturesData, setFixturesData] = useState<GameweekFixtures | null>(null);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(false);

  const [editingFixtureId, setEditingFixtureId] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Load league metadata
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLeagueError(null);
    getLeague(id)
      .then((data) => {
        if (!cancelled) setLeague(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLeagueError(err instanceof Error ? err.message : 'Failed to load league');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load gameweeks
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setGameweeksLoading(true);
    setGameweeksError(null);

    listGameweeks(id)
      .then((data) => {
        if (cancelled) return;
        setGameweeks(data);
        setSelectedRound((prev) => prev ?? pickDefaultRound(data));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setGameweeksError(
          err instanceof Error ? err.message : 'Failed to load gameweeks'
        );
      })
      .finally(() => {
        if (cancelled) return;
        setGameweeksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  // Load fixtures for the selected round
  useEffect(() => {
    if (!id || !selectedRound) {
      setFixturesData(null);
      return;
    }
    let cancelled = false;
    setFixturesLoading(true);
    setFixturesError(null);

    getGameweekFixtures(id, selectedRound)
      .then((data) => {
        if (!cancelled) setFixturesData(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFixturesError(
          err instanceof Error ? err.message : 'Failed to load fixtures'
        );
      })
      .finally(() => {
        if (cancelled) return;
        setFixturesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, selectedRound, reloadToken]);

  const editingFixture: FixtureWithPrediction | null = useMemo(() => {
    if (!fixturesData || editingFixtureId == null) return null;
    return fixturesData.fixtures.find((f) => f.id === editingFixtureId) ?? null;
  }, [fixturesData, editingFixtureId]);

  const handlePredictionSaved = useCallback(
    (updated: MyPrediction) => {
      if (!fixturesData || editingFixtureId == null) return;

      const wasNew =
        fixturesData.fixtures.find((f) => f.id === editingFixtureId)
          ?.userPrediction === null;

      const updatedFixtures = fixturesData.fixtures.map((f) =>
        f.id === editingFixtureId ? { ...f, userPrediction: updated } : f
      );
      setFixturesData({ ...fixturesData, fixtures: updatedFixtures });

      if (wasNew) {
        setGameweeks((prev) =>
          prev
            ? prev.map((gw) =>
                gw.round === fixturesData.round
                  ? {
                      ...gw,
                      userPredictionCount: gw.userPredictionCount + 1,
                    }
                  : gw
              )
            : prev
        );
      }
    },
    [fixturesData, editingFixtureId]
  );

  if (!id) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to={`/leagues/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to league
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Predictions{league ? ` for ${league.name}` : ''}
          </h1>
          {league && (
            <p className="text-sm text-gray-600 mt-0.5">
              {league.competition.name} · Season {league.competition.seasonYear}
            </p>
          )}
          {leagueError && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{leagueError}</span>
            </div>
          )}
        </div>

        {/* Gameweek picker */}
        {gameweeksLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : gameweeksError ? (
          <div className="flex items-center justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{gameweeksError}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReloadToken((t) => t + 1)}
            >
              Retry
            </Button>
          </div>
        ) : gameweeks && gameweeks.length === 0 ? (
          <div className="p-8 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-500">
            <p className="font-medium text-gray-700">Fixtures syncing…</p>
            <p className="text-sm mt-1">
              We're pulling the latest fixtures for this competition. Check back shortly.
            </p>
          </div>
        ) : gameweeks ? (
          <GameweekPicker
            gameweeks={gameweeks}
            selectedRound={selectedRound}
            onSelect={setSelectedRound}
          />
        ) : null}

        {/* Fixtures panel */}
        {selectedRound && (
          <div className="space-y-4">
            {fixturesLoading ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : fixturesError ? (
              <div className="flex items-center justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{fixturesError}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReloadToken((t) => t + 1)}
                >
                  Retry
                </Button>
              </div>
            ) : fixturesData ? (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">
                    {fixturesData.fixtures.length}{' '}
                    {fixturesData.fixtures.length === 1 ? 'fixture' : 'fixtures'}
                  </div>
                  {fixturesData.locksAt && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-gray-500">Earliest match locks in</span>
                      <LockCountdown locksAt={fixturesData.locksAt} />
                    </div>
                  )}
                </div>

                {fixturesData.fixtures.length === 0 ? (
                  <div className="p-8 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-500">
                    <p className="font-medium text-gray-700">No fixtures yet</p>
                    <p className="text-sm mt-1">
                      Fixtures for this gameweek haven't been synced yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {fixturesData.fixtures.map((fixture) => (
                      <MatchPredictionCard
                        key={fixture.id}
                        fixture={fixture}
                        onEdit={() => setEditingFixtureId(fixture.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {editingFixture && (
        <MatchPredictionModal
          fixture={editingFixture}
          leagueId={id}
          open={true}
          onClose={() => setEditingFixtureId(null)}
          onSaved={handlePredictionSaved}
        />
      )}
    </div>
  );
}
