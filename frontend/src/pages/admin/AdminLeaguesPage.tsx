import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import { listAdminLeagues, patchLeague } from '../../api/admin';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { AdminLeague } from '../../types/admin';
import type { PageResponse } from '../../types/league';

const PAGE_SIZE = 12;

type ArchivedFilter = 'active' | 'archived' | 'all';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export function AdminLeaguesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>('active');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<AdminLeague> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const archivedParam = useMemo((): boolean | undefined => {
    if (archivedFilter === 'active') return false;
    if (archivedFilter === 'archived') return true;
    return undefined;
  }, [archivedFilter]);

  const fetchKey = useMemo(
    () => `${debouncedSearch}|${archivedFilter}|${page}`,
    [debouncedSearch, archivedFilter, page]
  );
  const latestFetchKey = useRef(fetchKey);
  latestFetchKey.current = fetchKey;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const myKey = fetchKey;
    try {
      const res = await listAdminLeagues({
        search: debouncedSearch || undefined,
        archived: archivedParam,
        page,
        size: PAGE_SIZE,
      });
      if (latestFetchKey.current !== myKey) return;
      setData(res);
    } catch (err: unknown) {
      if (latestFetchKey.current !== myKey) return;
      setError(err instanceof Error ? err.message : 'Failed to load leagues');
    } finally {
      if (latestFetchKey.current === myKey) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, archivedParam, page, fetchKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleArchiveChange = (value: string) => {
    setArchivedFilter(value as ArchivedFilter);
    setPage(0);
  };

  const handleToggleArchived = async (row: AdminLeague) => {
    setActionError(null);
    setTogglingId(row.id);
    const previous = data;
    if (data) {
      setData({
        ...data,
        content: data.content.map((r) =>
          r.id === row.id ? { ...r, archived: !r.archived } : r
        ),
      });
    }
    try {
      const updated = await patchLeague(row.id, { archived: !row.archived });
      setData((prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((r) =>
                r.id === row.id ? updated : r
              ),
            }
          : prev
      );
    } catch (err: unknown) {
      setData(previous);
      setActionError(
        err instanceof Error ? err.message : 'Failed to update league'
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" /> Leagues
        </h1>
        <p className="text-gray-600 mt-1 text-sm">
          Search all leagues and toggle archive status.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="md:flex-1">
          <Input
            label="Search"
            placeholder="Search by league name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="md:w-56">
          <label
            htmlFor="admin-league-archived-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Status
          </label>
          <select
            id="admin-league-archived-filter"
            value={archivedFilter}
            onChange={(e) => handleArchiveChange(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-red-700 hover:text-red-900"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : data ? (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Competition
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Members
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.content.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-sm text-gray-500"
                      >
                        No leagues match your filters.
                      </td>
                    </tr>
                  ) : (
                    data.content.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {row.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {row.visibility}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{row.competitionName}</div>
                          <div className="text-xs text-gray-500">
                            Season {row.seasonYear}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.ownerUsername}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                          {row.memberCount}
                        </td>
                        <td className="px-4 py-3">
                          {row.archived ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Archived
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleArchived(row)}
                            isLoading={togglingId === row.id}
                            icon={
                              row.archived ? (
                                <ArchiveRestore className="w-4 h-4" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )
                            }
                          >
                            {row.archived ? 'Restore' : 'Archive'}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
  );
}
