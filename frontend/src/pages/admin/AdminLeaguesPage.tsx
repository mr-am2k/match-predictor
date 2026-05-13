import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
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
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

const FILTERS: { value: ArchivedFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

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

  const handleArchiveChange = (value: ArchivedFilter) => {
    setArchivedFilter(value);
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

  const totalElements = data?.page.totalElements ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="animate-fade-up">
        <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
          / Leagues
        </p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
          League registry
        </h1>
        <p className="mt-4 text-sm text-[color:var(--color-ink-200)] max-w-xl">
          Search every manager-created league. Toggle archive status to
          silence inactive competitions without destroying history.
        </p>
      </header>

      {/* Filters */}
      <div className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="md:flex-1">
            <Input
              label="Search"
              placeholder="Search by league name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              icon={<Search />}
            />
          </div>
          <div>
            <p className="block text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-[color:var(--color-ink-300)] mb-2">
              Status filter
            </p>
            <div
              role="tablist"
              aria-label="Status filter"
              className="inline-flex rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/70 p-1"
            >
              {FILTERS.map((f) => {
                const active = archivedFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleArchiveChange(f.value)}
                    className={`px-3.5 py-2 rounded-md font-mono text-[0.68rem] tracking-[0.22em] uppercase transition-colors ${
                      active
                        ? 'bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] shadow-[0_0_0_1px_rgba(215,255,61,0.4)]'
                        : 'text-[color:var(--color-ink-200)] hover:text-[color:var(--color-ink-50)]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs font-mono tracking-[0.2em] uppercase text-[color:var(--color-ink-400)]">
          <span>
            Results{' '}
            <span className="text-[color:var(--color-ink-100)]">
              {totalElements.toLocaleString()}
            </span>
          </span>
          {debouncedSearch && (
            <span className="chip">match · “{debouncedSearch}”</span>
          )}
        </div>
      </div>

      {actionError && (
        <AlertBanner
          tone="loss"
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      {isLoading && !data ? (
        <LoadingBlock />
      ) : error ? (
        <AlertBanner tone="loss" message={error} />
      ) : data ? (
        <>
          <section className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur overflow-hidden relative">
            {isLoading && (
              <div
                aria-hidden
                className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden"
              >
                <div className="h-full w-1/3 bg-[color:var(--color-volt-200)] animate-[marquee_1.2s_linear_infinite]" />
              </div>
            )}

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[color:var(--color-ink-700)]">
              <div>
                <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
                  / Roster
                </p>
                <h2 className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)] mt-0.5">
                  Leagues
                </h2>
              </div>
              <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                Page {data.page.number + 1}
                <span className="text-[color:var(--color-ink-500)]">
                  {' '}
                  / {Math.max(1, data.page.totalPages)}
                </span>
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--color-ink-700)]">
                    <Th>Name</Th>
                    <Th>Competition</Th>
                    <Th>Owner</Th>
                    <Th align="right">Members</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-16 text-center font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]"
                      >
                        No leagues match your filters
                      </td>
                    </tr>
                  ) : (
                    data.content.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-800)]/40 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-semibold text-[color:var(--color-ink-50)]">
                            {row.name}
                          </div>
                          <div className="mt-0.5">
                            <VisibilityChip visibility={row.visibility} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-[color:var(--color-ink-100)]">
                            {row.competitionName}
                          </div>
                          <div className="font-mono text-[0.6rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] mt-0.5">
                            Season {row.seasonYear}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] grid place-items-center text-[0.65rem] font-bold text-[color:var(--color-ink-100)] uppercase">
                              {row.ownerUsername.slice(0, 2)}
                            </div>
                            <span className="text-sm text-[color:var(--color-ink-100)] truncate max-w-[10rem]">
                              {row.ownerUsername}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[color:var(--color-ink-50)] font-semibold">
                          {row.memberCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <ArchivedChip archived={row.archived} />
                        </td>
                        <td className="px-4 py-3.5 font-mono tabular-nums text-[0.72rem] text-[color:var(--color-ink-200)] whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleArchived(row)}
                            isLoading={togglingId === row.id}
                            icon={
                              row.archived ? <ArchiveRestore /> : <Archive />
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

            {/* Mobile stacked */}
            <div className="lg:hidden flex flex-col divide-y divide-[color:var(--color-ink-700)]">
              {data.content.length === 0 ? (
                <div className="px-5 py-16 text-center font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]">
                  No leagues match your filters
                </div>
              ) : (
                data.content.map((row) => (
                  <div key={row.id} className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[color:var(--color-ink-50)] truncate">
                          {row.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <VisibilityChip visibility={row.visibility} />
                          <ArchivedChip archived={row.archived} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="scoreboard text-2xl text-[color:var(--color-volt-200)] leading-none">
                          {row.memberCount.toLocaleString()}
                        </p>
                        <p className="mt-1 font-mono text-[0.58rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]">
                          Members
                        </p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <MobileMeta
                        label="Competition"
                        value={row.competitionName}
                      />
                      <MobileMeta
                        label="Season"
                        mono
                        value={String(row.seasonYear)}
                      />
                      <MobileMeta
                        label="Owner"
                        value={row.ownerUsername}
                      />
                      <MobileMeta
                        label="Created"
                        mono
                        value={formatDate(row.createdAt)}
                      />
                    </dl>

                    <div className="flex justify-end pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleArchived(row)}
                        isLoading={togglingId === row.id}
                        icon={row.archived ? <ArchiveRestore /> : <Archive />}
                      >
                        {row.archived ? 'Restore' : 'Archive'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {data.page.totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.page.number === 0}
                icon={<ChevronLeft />}
              >
                Previous
              </Button>
              <div className="text-center font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-300)]">
                Page{' '}
                <span className="text-[color:var(--color-ink-50)]">
                  {data.page.number + 1}
                </span>{' '}
                / {data.page.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.page.number >= data.page.totalPages - 1}
                icon={<ChevronRight />}
                iconPosition="right"
              >
                Next
              </Button>
            </nav>
          )}
        </>
      ) : null}
    </div>
  );
}

/* ---------- Helpers ---------- */

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      scope="col"
    >
      {children}
    </th>
  );
}

function VisibilityChip({ visibility }: { visibility: string }) {
  const isPublic = visibility.toUpperCase() === 'PUBLIC';
  return (
    <span
      className={isPublic ? 'chip chip-volt' : 'chip'}
      title={`${visibility} league`}
    >
      {isPublic ? 'Public' : 'Private'}
    </span>
  );
}

function ArchivedChip({ archived }: { archived: boolean }) {
  if (archived) {
    return <span className="chip">Archived</span>;
  }
  return <span className="chip chip-win">Active</span>;
}

function MobileMeta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[0.58rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-[color:var(--color-ink-50)] truncate ${
          mono ? 'font-mono tabular-nums' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="py-24 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-7 h-7 text-[color:var(--color-volt-200)] animate-spin" />
      <p className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)]">
        Loading roster…
      </p>
    </div>
  );
}

function AlertBanner({
  tone,
  message,
  onDismiss,
}: {
  tone: 'loss' | 'draw';
  message: string;
  onDismiss?: () => void;
}) {
  const toneClasses =
    tone === 'loss'
      ? 'border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)]'
      : 'border-[color:var(--color-draw-500)]/40 bg-[color:var(--color-draw-500)]/8 text-[color:var(--color-draw-500)]';
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${toneClasses}`}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-current/80 hover:text-current"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
