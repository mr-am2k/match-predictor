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

  // Load all-time standings page
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

  // Load gameweeks when switching to gameweek mode
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
          // pick the latest settled round by firstKickoffAt (locksAt can be null once all fixtures are locked)
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

  // Load gameweek standings when round changes
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
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setMode('all-time')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'all-time'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All-time
        </button>
        <button
          type="button"
          onClick={() => setMode('gameweek')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'gameweek'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
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
  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
          <Trophy className="w-6 h-6 text-indigo-600" />
        </div>
        <p className="text-gray-600">
          No scores yet. Come back after the first gameweek settles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="py-2 px-3 w-16">Rank</th>
              <th className="py-2 px-3">User</th>
              <th className="py-2 px-3 text-right">GW</th>
              <th className="py-2 px-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrentUser =
                currentUserId !== null && row.userId === currentUserId;
              return (
                <tr
                  key={row.userId}
                  className={`border-b border-gray-100 ${
                    isCurrentUser ? 'bg-indigo-50' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-semibold text-gray-900">
                    #{row.rank}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={
                        isCurrentUser
                          ? 'font-semibold text-indigo-700'
                          : 'text-gray-900'
                      }
                    >
                      {row.username}
                    </span>
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-indigo-600 font-medium">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600">
                    {row.gameweeksPlayed}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900">
                    {row.totalPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={isFirst}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={isLast}
              icon={<ChevronRight className="w-4 h-4" />}
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
  if (gameweeksLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (gameweeksError) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{gameweeksError}</span>
      </div>
    );
  }

  if (gameweeks.length === 0) {
    return (
      <div className="py-12 text-center text-gray-600 text-sm">
        No gameweeks available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="gameweek-standings-round"
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Gameweek
        </label>
        <select
          id="gameweek-standings-round"
          value={selectedRound ?? ''}
          onChange={(event) => onSelectRound(event.target.value)}
          className="block w-full sm:w-64 rounded-lg border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          {gameweeks.map((gw) => (
            <option key={gw.round} value={gw.round}>
              {shortenRound(gw.round)} ({gw.status})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
            <Trophy className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-gray-600">
            No scores for this gameweek yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="py-2 px-3 w-16">Rank</th>
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3 text-right">Predictions</th>
                <th className="py-2 px-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isCurrentUser =
                  currentUserId !== null && row.userId === currentUserId;
                return (
                  <tr
                    key={row.userId}
                    className={`border-b border-gray-100 ${
                      isCurrentUser ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-gray-900">
                      #{row.rank}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={
                          isCurrentUser
                            ? 'font-semibold text-indigo-700'
                            : 'text-gray-900'
                        }
                      >
                        {row.username}
                      </span>
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-indigo-600 font-medium">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      {row.predictionsCount}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">
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
