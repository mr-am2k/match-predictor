import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
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

  // Debounce search input
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // Reset page when competition changes
  const handleCompetitionChange = (value: string) => {
    setCompetitionId(value === '' ? undefined : Number(value));
    setPage(0);
  };

  // Load competitions once
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Browse public leagues
          </h1>
          <p className="text-gray-600 mt-1">
            Join a public league to start predicting with others.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="md:w-64">
            <label
              htmlFor="browse-competition-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Competition
            </label>
            <select
              id="browse-competition-filter"
              value={competitionId === undefined ? '' : String(competitionId)}
              onChange={(e) => handleCompetitionChange(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : data && data.content.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-600">
              No public leagues yet. Be the first to create one.
            </p>
            <Link to="/leagues/new" className="inline-block mt-4">
              <Button>Create a league</Button>
            </Link>
          </div>
        ) : data ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.content.map((league) => (
                <LeagueBrowseCard
                  key={league.id}
                  league={league}
                  onJoined={loadPage}
                />
              ))}
            </div>

            {data.page.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={data.page.number === 0}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {data.page.number + 1} of {data.page.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page.number >= data.page.totalPages - 1}
                  icon={<ChevronRight className="w-4 h-4" />}
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
