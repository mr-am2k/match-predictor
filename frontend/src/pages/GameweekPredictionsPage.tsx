import { AlertCircle, ArrowLeft, Loader2, CalendarClock } from 'lucide-react';
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
        setGameweeksError(err instanceof Error ? err.message : 'Failed to load gameweeks');
      })
      .finally(() => {
        if (cancelled) return;
        setGameweeksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

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
        setFixturesError(err instanceof Error ? err.message : 'Failed to load fixtures');
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
        fixturesData.fixtures.find((f) => f.id === editingFixtureId)?.userPrediction === null;

      const updatedFixtures = fixturesData.fixtures.map((f) =>
        f.id === editingFixtureId ? { ...f, userPrediction: updated } : f
      );
      setFixturesData({ ...fixturesData, fixtures: updatedFixtures });

      if (wasNew) {
        setGameweeks((prev) =>
          prev
            ? prev.map((gw) =>
                gw.round === fixturesData.round
                  ? { ...gw, userPredictionCount: gw.userPredictionCount + 1 }
                  : gw
              )
            : prev
        );
      }
    },
    [fixturesData, editingFixtureId]
  );

  if (!id) return null;

  const predictionCount = fixturesData
    ? fixturesData.fixtures.filter((f) => f.userPrediction !== null).length
    : 0;
  const totalFixtures = fixturesData?.fixtures.length ?? 0;

  return (
    <div className="min-h-[calc(100vh-72px)]">
      <div className="max-w-[72rem] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <Link
          to={`/leagues/${id}`}
          className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to league
        </Link>

        {/* Header */}
        <div className="animate-fade-up">
          <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
            / Matchday · Predictions
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
            {league ? league.name : 'Loading…'}
          </h1>
          {league && (
            <p className="mt-3 font-mono text-[0.75rem] tracking-[0.15em] uppercase text-[color:var(--color-ink-300)]">
              {league.competition.name} · Season {league.competition.seasonYear}
            </p>
          )}
        </div>

        {leagueError && (
          <div className="mt-5 flex items-center gap-2 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{leagueError}</span>
          </div>
        )}

        {/* Gameweek picker */}
        <div className="mt-10">
          {gameweeksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[color:var(--color-volt-200)] animate-spin" />
            </div>
          ) : gameweeksError ? (
            <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{gameweeksError}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setReloadToken((t) => t + 1)}>
                Retry
              </Button>
            </div>
          ) : gameweeks && gameweeks.length === 0 ? (
            <EmptyPanel
              title="Fixtures syncing…"
              body="We're pulling the latest fixtures for this competition. Check back shortly."
            />
          ) : gameweeks ? (
            <GameweekPicker
              gameweeks={gameweeks}
              selectedRound={selectedRound}
              onSelect={setSelectedRound}
            />
          ) : null}
        </div>

        {/* Fixtures */}
        {selectedRound && (
          <div className="mt-8 space-y-5">
            {fixturesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-[color:var(--color-volt-200)] animate-spin" />
              </div>
            ) : fixturesError ? (
              <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fixturesError}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setReloadToken((t) => t + 1)}>
                  Retry
                </Button>
              </div>
            ) : fixturesData ? (
              <>
                {/* Gameweek summary strip */}
                <div className="rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/80 backdrop-blur p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-300)] mb-1">
                        Gameweek {fixturesData.round}
                      </p>
                      <p className="font-display text-3xl text-[color:var(--color-ink-50)] tracking-wide">
                        {totalFixtures} {totalFixtures === 1 ? 'FIXTURE' : 'FIXTURES'}
                      </p>
                    </div>
                    <div className="hidden sm:block h-10 w-px bg-[color:var(--color-ink-700)]" />
                    <div>
                      <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-300)] mb-1">
                        Picks made
                      </p>
                      <p className="scoreboard text-3xl text-[color:var(--color-volt-200)]">
                        {predictionCount}
                        <span className="text-[color:var(--color-ink-400)] text-xl">/{totalFixtures}</span>
                      </p>
                    </div>
                  </div>

                  {fixturesData.locksAt && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60">
                      <CalendarClock className="w-4 h-4 text-[color:var(--color-ink-300)]" />
                      <div className="text-right">
                        <p className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                          Earliest lock
                        </p>
                        <LockCountdown locksAt={fixturesData.locksAt} />
                      </div>
                    </div>
                  )}
                </div>

                {fixturesData.fixtures.length === 0 ? (
                  <EmptyPanel
                    title="No fixtures yet"
                    body="Fixtures for this gameweek haven't been synced yet."
                  />
                ) : (
                  <div className="grid gap-3 stagger">
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

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/40 p-10 text-center">
      <p className="font-display text-3xl tracking-wide text-[color:var(--color-ink-100)]">{title}</p>
      <p className="mt-2 text-sm text-[color:var(--color-ink-300)]">{body}</p>
    </div>
  );
}
