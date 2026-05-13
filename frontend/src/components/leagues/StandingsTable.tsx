import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Trophy } from 'lucide-react';
import { getGameweekStandings, getStandings } from '../../api/leagues';
import { listGameweeks } from '../../api/fixtures';
import { useAuth } from '../../context/AuthContext';
import type { GameweekStandingsRow, StandingsRow } from '../../types/standings';
import type { PageResponse } from '../../types/league';
import type { GameweekSummary } from '../../types/prediction';
import { Button } from '../ui/Button';

interface StandingsTableProps {
  leagueId: string;
}

type Mode = 'all-time' | 'gameweek';

const PAGE_SIZE = 50;

function shortenRound(round: string): string {
  const regularMatch = round.match(/^Regular Season - (.+)$/i);
  if (regularMatch) {
    return `GW ${regularMatch[1]}`;
  }
  return round;
}

function rankTone(rank: number): string {
  if (rank === 1) return 'text-[color:var(--color-volt-200)]';
  if (rank === 2) return 'text-[color:var(--color-ink-100)]';
  if (rank === 3) return 'text-[color:var(--color-draw-500)]';
  return 'text-[color:var(--color-ink-300)]';
}

export function StandingsTable({ leagueId }: StandingsTableProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('all-time');

  // All-time state
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<StandingsRow> | null>(null);
  const [allTimeError, setAllTimeError] = useState<string | null>(null);
  const [allTimeLoading, setAllTimeLoading] = useState(false);

  // Gameweek state
  const [gameweeks, setGameweeks] = useState<GameweekSummary[] | null>(null);
  const [gameweeksError, setGameweeksError] = useState<string | null>(null);
  const [gameweeksLoading, setGameweeksLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [gwRows, setGwRows] = useState<GameweekStandingsRow[] | null>(null);
  const [gwError, setGwError] = useState<string | null>(null);
  const [gwLoading, setGwLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'all-time') return;
    let cancelled = false;
    setAllTimeLoading(true);
    setAllTimeError(null);

    getStandings(leagueId, page, PAGE_SIZE)
      .then((data) => {
        if (cancelled) return;
        setPageData(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAllTimeError(err instanceof Error ? err.message : 'Failed to load standings');
      })
      .finally(() => {
        if (cancelled) return;
        setAllTimeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leagueId, page, mode]);

  useEffect(() => {
    if (mode !== 'gameweek') return;
    if (gameweeks !== null) return;

    let cancelled = false;
    setGameweeksLoading(true);
    setGameweeksError(null);

    listGameweeks(leagueId)
      .then((data) => {
        if (cancelled) return;
        setGameweeks(data);
        const settled = data.filter((gw) => gw.status === 'SETTLED');
        if (settled.length > 0) {
          const sorted = [...settled].sort(
            (a, b) =>
              new Date(b.firstKickoffAt).getTime() -
              new Date(a.firstKickoffAt).getTime()
          );
          setSelectedRound(sorted[0].round);
        } else if (data.length > 0) {
          setSelectedRound(data[0].round);
        }
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
  }, [leagueId, mode, gameweeks]);

  useEffect(() => {
    if (mode !== 'gameweek' || !selectedRound) {
      return;
    }
    let cancelled = false;
    setGwLoading(true);
    setGwError(null);

    getGameweekStandings(leagueId, selectedRound)
      .then((data) => {
        if (cancelled) return;
        setGwRows(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setGwError(
          err instanceof Error ? err.message : 'Failed to load gameweek standings'
        );
      })
      .finally(() => {
        if (cancelled) return;
        setGwLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leagueId, mode, selectedRound]);

  const rows = pageData?.content ?? [];
  const totalPages = pageData?.page.totalPages ?? 0;
  const currentPage = pageData?.page.number ?? 0;
  const isFirst = currentPage === 0;
  const isLast = totalPages === 0 || currentPage >= totalPages - 1;

  const roundOptions = useMemo(() => gameweeks ?? [], [gameweeks]);

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/70 p-1 font-mono text-[0.7rem] tracking-[0.2em] uppercase">
        <button
          type="button"
          onClick={() => setMode('all-time')}
          className={`px-4 py-2 rounded-md transition-colors ${
            mode === 'all-time'
              ? 'bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] shadow-[0_4px_14px_-4px_rgba(215,255,61,0.5)]'
              : 'text-[color:var(--color-ink-200)] hover:text-[color:var(--color-ink-50)]'
          }`}
        >
          All-time
        </button>
        <button
          type="button"
          onClick={() => setMode('gameweek')}
          className={`px-4 py-2 rounded-md transition-colors ${
            mode === 'gameweek'
              ? 'bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] shadow-[0_4px_14px_-4px_rgba(215,255,61,0.5)]'
              : 'text-[color:var(--color-ink-200)] hover:text-[color:var(--color-ink-50)]'
          }`}
        >
          By gameweek
        </button>
      </div>

      {mode === 'all-time' ? (
        <AllTimeView
          rows={rows}
          isLoading={allTimeLoading}
          error={allTimeError}
          currentUserId={user?.id ?? null}
          page={currentPage}
          totalPages={totalPages}
          isFirst={isFirst}
          isLast={isLast}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      ) : (
        <GameweekView
          gameweeks={roundOptions}
          gameweeksLoading={gameweeksLoading}
          gameweeksError={gameweeksError}
          selectedRound={selectedRound}
          onSelectRound={(round) => {
            setSelectedRound(round);
            setGwRows(null);
          }}
          rows={gwRows}
          isLoading={gwLoading}
          error={gwError}
          currentUserId={user?.id ?? null}
        />
      )}
    </div>
  );
}

interface EmptyBoardProps {
  label: string;
}

function EmptyBoard({ label }: EmptyBoardProps) {
  return (
    <div className="py-14 text-center rounded-xl border border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/40">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)] mb-4">
        <Trophy className="w-5 h-5 text-[color:var(--color-ink-400)]" />
      </div>
      <p className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-400)] mb-2">
        / No data yet
      </p>
      <p className="text-sm text-[color:var(--color-ink-200)]">{label}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="py-14 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[color:var(--color-volt-200)] animate-spin" />
    </div>
  );
}

interface AllTimeViewProps {
  rows: StandingsRow[];
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  page: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
}

function AllTimeView({
  rows,
  isLoading,
  error,
  currentUserId,
  page,
  totalPages,
  isFirst,
  isLast,
  onPrev,
  onNext,
}: AllTimeViewProps) {
  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorBanner message={error} />;

  if (rows.length === 0) {
    return <EmptyBoard label="No scores yet. Come back after the first gameweek settles." />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] border-b border-[color:var(--color-ink-700)]">
              <th className="py-3 px-4 w-16">Rank</th>
              <th className="py-3 px-4">Manager</th>
              <th className="py-3 px-4 text-right w-20 hidden sm:table-cell">GW</th>
              <th className="py-3 px-4 text-right w-28">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrentUser =
                currentUserId !== null && row.userId === currentUserId;
              return (
                <tr
                  key={row.userId}
                  className={`border-b border-[color:var(--color-ink-700)]/60 last:border-b-0 transition-colors ${
                    isCurrentUser
                      ? 'bg-[color:var(--color-volt-200)]/5'
                      : 'hover:bg-[color:var(--color-ink-800)]/60'
                  }`}
                >
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-1 rounded-md font-mono tabular-nums text-xs border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/80 ${rankTone(row.rank)}`}
                    >
                      {String(row.rank).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        isCurrentUser
                          ? 'font-semibold text-[color:var(--color-volt-200)]'
                          : 'font-semibold text-[color:var(--color-ink-50)]'
                      }
                    >
                      {row.username}
                    </span>
                    {isCurrentUser && (
                      <span className="ml-2 font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-volt-200)]">
                        · you
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[color:var(--color-ink-300)] hidden sm:table-cell">
                    {row.gameweeksPlayed}
                  </td>
                  <td className="py-3 px-4 text-right scoreboard text-base text-[color:var(--color-ink-50)]">
                    {row.totalPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)]">
            Page {String(page + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={isFirst}
              icon={<ChevronLeft />}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={isLast}
              icon={<ChevronRight />}
              iconPosition="right"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface GameweekViewProps {
  gameweeks: GameweekSummary[];
  gameweeksLoading: boolean;
  gameweeksError: string | null;
  selectedRound: string | null;
  onSelectRound: (round: string) => void;
  rows: GameweekStandingsRow[] | null;
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
}

function GameweekView({
  gameweeks,
  gameweeksLoading,
  gameweeksError,
  selectedRound,
  onSelectRound,
  rows,
  isLoading,
  error,
  currentUserId,
}: GameweekViewProps) {
  if (gameweeksLoading) return <LoadingBlock />;
  if (gameweeksError) return <ErrorBanner message={gameweeksError} />;

  if (gameweeks.length === 0) {
    return <EmptyBoard label="No gameweeks available yet." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="gameweek-standings-round"
          className="block text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[color:var(--color-ink-300)] mb-2"
        >
          Gameweek
        </label>
        <select
          id="gameweek-standings-round"
          value={selectedRound ?? ''}
          onChange={(event) => onSelectRound(event.target.value)}
          className="block w-full sm:w-72 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/70 py-2.5 px-3 text-sm text-[color:var(--color-ink-50)] focus:outline-none focus:border-[color:var(--color-volt-200)]/70"
        >
          {gameweeks.map((gw) => (
            <option key={gw.round} value={gw.round}>
              {shortenRound(gw.round)} ({gw.status})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !rows || rows.length === 0 ? (
        <EmptyBoard label="No scores for this gameweek yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] border-b border-[color:var(--color-ink-700)]">
                <th className="py-3 px-4 w-16">Rank</th>
                <th className="py-3 px-4">Manager</th>
                <th className="py-3 px-4 text-right w-24 hidden sm:table-cell">Picks</th>
                <th className="py-3 px-4 text-right w-24">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isCurrentUser =
                  currentUserId !== null && row.userId === currentUserId;
                return (
                  <tr
                    key={row.userId}
                    className={`border-b border-[color:var(--color-ink-700)]/60 last:border-b-0 transition-colors ${
                      isCurrentUser
                        ? 'bg-[color:var(--color-volt-200)]/5'
                        : 'hover:bg-[color:var(--color-ink-800)]/60'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-1 rounded-md font-mono tabular-nums text-xs border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/80 ${rankTone(row.rank)}`}
                      >
                        {String(row.rank).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          isCurrentUser
                            ? 'font-semibold text-[color:var(--color-volt-200)]'
                            : 'font-semibold text-[color:var(--color-ink-50)]'
                        }
                      >
                        {row.username}
                      </span>
                      {isCurrentUser && (
                        <span className="ml-2 font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-volt-200)]">
                          · you
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[color:var(--color-ink-300)] hidden sm:table-cell">
                      {row.predictionsCount}
                    </td>
                    <td className="py-3 px-4 text-right scoreboard text-base text-[color:var(--color-ink-50)]">
                      {row.gameweekPoints}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
