import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Plus, Search } from 'lucide-react';
import { browsePublicLeagues } from '../api/leagues';
import { listCompetitions } from '../api/competitions';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LeagueBrowseCard } from '../components/leagues/LeagueBrowseCard';
import type { LeagueBrowseItem, PageResponse } from '../types/league';
import type { Competition } from '../types/competition';

const PAGE_SIZE = 12;

export function BrowseLeaguesPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionId] = useState<number | undefined>(undefined);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<LeagueBrowseItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const handleCompetitionChange = (value: string) => {
    setCompetitionId(value === '' ? undefined : Number(value));
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    listCompetitions()
      .then((comps) => {
        if (cancelled) return;
        setCompetitions(comps);
      })
      .catch(() => {
        // Non-fatal; competition filter just won't populate.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchKey = useMemo(
    () => `${competitionId ?? ''}|${debouncedSearch}|${page}`,
    [competitionId, debouncedSearch, page]
  );
  const latestFetchKey = useRef(fetchKey);
  latestFetchKey.current = fetchKey;

  const loadPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const myKey = fetchKey;
    try {
      const res = await browsePublicLeagues({
        competitionId,
        search: debouncedSearch || undefined,
        page,
        size: PAGE_SIZE,
      });
      if (latestFetchKey.current !== myKey) return;
      setData(res);
    } catch (err: unknown) {
      if (latestFetchKey.current !== myKey) return;
      setError(err instanceof Error ? err.message : 'Failed to load public leagues');
    } finally {
      if (latestFetchKey.current === myKey) {
        setIsLoading(false);
      }
    }
  }, [competitionId, debouncedSearch, page, fetchKey]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const totalLeagues = data?.page.totalElements ?? 0;

  return (
    <div className="min-h-[calc(100vh-72px)]">
      <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>

        {/* Header */}
        <div className="mb-10 animate-fade-up grid lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8">
            <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
              / Browse · Public leagues
            </p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
              Find your
              <br />
              <span className="text-[color:var(--color-volt-200)]">crew.</span>
            </h1>
            <p className="mt-5 text-[color:var(--color-ink-200)] max-w-xl">
              Open leagues from managers around the world. Filter by competition, search by name, and drop in before the first whistle.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col items-start lg:items-end gap-2">
            {data && (
              <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/70">
                <span className="scoreboard text-3xl text-[color:var(--color-volt-200)]">
                  {totalLeagues.toString().padStart(2, '0')}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-mono text-[0.6rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                    Leagues
                  </span>
                  <span className="font-mono text-[0.6rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)]">
                    currently open
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/70 p-5 sm:p-6 mb-8 animate-fade-up">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="md:w-72">
              <label
                htmlFor="browse-competition-filter"
                className="block text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[color:var(--color-ink-300)] mb-2"
              >
                Competition
              </label>
              <select
                id="browse-competition-filter"
                value={competitionId === undefined ? '' : String(competitionId)}
                onChange={(e) => handleCompetitionChange(e.target.value)}
                className="block w-full rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/70 px-4 py-2.5 text-sm text-[color:var(--color-ink-50)] focus:outline-none focus:border-[color:var(--color-volt-200)]/70"
              >
                <option value="">All competitions</option>
                {competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.seasonYear})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:flex-1">
              <Input
                label="Search"
                placeholder="Search by league name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                icon={<Search />}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[color:var(--color-volt-200)] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : data && data.content.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/40">
            <p className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-400)] mb-3">
              / Empty board
            </p>
            <h3 className="font-display text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)] mb-3">
              No public leagues yet
            </h3>
            <p className="text-sm text-[color:var(--color-ink-200)] max-w-md mx-auto mb-6">
              Be the first to open a contest. Invite your friends or let strangers join.
            </p>
            <Link to="/leagues/new">
              <Button icon={<Plus />}>Create a league</Button>
            </Link>
          </div>
        ) : data ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {data.content.map((league) => (
                <LeagueBrowseCard
                  key={league.id}
                  league={league}
                  onJoined={loadPage}
                />
              ))}
            </div>

            {data.page.totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={data.page.number === 0}
                  icon={<ChevronLeft />}
                >
                  Previous
                </Button>
                <div className="font-mono text-[0.7rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                  Page {String(data.page.number + 1).padStart(2, '0')} / {String(data.page.totalPages).padStart(2, '0')}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page.number >= data?.page?.totalPages - 1}
                  icon={<ChevronRight />}
                  iconPosition="right"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
