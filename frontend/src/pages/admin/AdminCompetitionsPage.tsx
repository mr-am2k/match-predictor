import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trophy,
  X,
} from 'lucide-react';
import {
  bootstrapCompetition,
  listAdminCompetitions,
  patchCompetition,
} from '../../api/admin';
import { Button } from '../../components/ui/Button';
import type { AdminCompetition, BootstrapResult } from '../../types/admin';

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export function AdminCompetitionsPage() {
  const [rows, setRows] = useState<AdminCompetition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [bootstrapResult, setBootstrapResult] = useState<BootstrapResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminCompetitions();
      setRows(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load competitions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (row: AdminCompetition) => {
    setActionError(null);
    setTogglingId(row.id);
    const previous = rows;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r))
    );
    try {
      const updated = await patchCompetition(row.id, { active: !row.active });
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
    } catch (err: unknown) {
      setRows(previous);
      setActionError(
        err instanceof Error ? err.message : 'Failed to update competition'
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleResync = async (row: AdminCompetition) => {
    setActionError(null);
    if (
      !window.confirm(
        `Resync ${row.name} (${row.seasonYear})?\n\nThis consumes API calls against the daily budget.`
      )
    ) {
      return;
    }
    setSyncingId(row.id);
    try {
      const result = await bootstrapCompetition(row.id);
      setBootstrapResult(result);
      await load();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to resync competition'
      );
    } finally {
      setSyncingId(null);
    }
  };

  const activeCount = rows.filter((r) => r.active).length;
  const totalFixtures = rows.reduce((acc, r) => acc + r.fixtureCount, 0);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-fade-up">
        <div>
          <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
            / Competitions
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
            Competition feed
          </h1>
          <p className="mt-4 text-sm text-[color:var(--color-ink-200)] max-w-xl">
            Manage active competitions, inspect sync health, and trigger
            manual bootstraps. Each resync draws from the daily API budget.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            icon={<RefreshCw className={isLoading ? 'animate-spin' : ''} />}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </header>

      {/* Scoreboard strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 stagger">
        <StatTile
          label="Tracked"
          value={rows.length.toString().padStart(2, '0')}
          accent={false}
        />
        <StatTile
          label="Active"
          value={activeCount.toString().padStart(2, '0')}
          accent
        />
        <StatTile
          label="Fixtures"
          value={totalFixtures.toLocaleString()}
          accent={false}
        />
        <StatTile
          label="Leagues"
          value={rows
            .reduce((acc, r) => acc + r.leagueCount, 0)
            .toLocaleString()}
          accent={false}
        />
      </div>

      {actionError && (
        <AlertBanner
          tone="loss"
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      {isLoading && rows.length === 0 ? (
        <LoadingBlock />
      ) : error ? (
        <AlertBanner tone="loss" message={error} />
      ) : (
        <section className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur overflow-hidden">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[color:var(--color-ink-700)]">
            <div>
              <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
                / Feed
              </p>
              <h2 className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)] mt-0.5">
                Registry
              </h2>
            </div>
            <span className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-300)] hidden sm:inline-flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--color-volt-200)] animate-volt-pulse" />
              {rows.length} rows
            </span>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--color-ink-700)]">
                  <Th>Competition</Th>
                  <Th>Country</Th>
                  <Th>Season</Th>
                  <Th>Active</Th>
                  <Th>Last sync</Th>
                  <Th align="right">Leagues</Th>
                  <Th align="right">Fixtures</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-16 text-center font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]"
                    >
                      No competitions on record
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-800)]/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <CompetitionBadge
                            logoUrl={row.logoUrl}
                            name={row.name}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[color:var(--color-ink-50)] truncate">
                              {row.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)]">
                                ID {row.id.toString().padStart(3, '0')}
                              </span>
                              {row.type && (
                                <span className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                                  · {row.type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[color:var(--color-ink-100)]">
                        {row.countryName ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums text-sm text-[color:var(--color-ink-50)]">
                        {row.seasonYear}/{(row.seasonYear + 1) % 100}
                      </td>
                      <td className="px-4 py-3.5">
                        <ActiveSwitch
                          checked={row.active}
                          disabled={togglingId === row.id}
                          onToggle={() => handleToggleActive(row)}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[0.72rem] tabular-nums text-[color:var(--color-ink-200)]">
                        {formatDateTime(row.lastSyncedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[color:var(--color-ink-50)]">
                        <span className="text-[color:var(--color-volt-200)] font-semibold">
                          {row.activeLeagueCount}
                        </span>
                        <span className="text-[color:var(--color-ink-400)]">
                          {' '}
                          / {row.leagueCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[color:var(--color-ink-50)]">
                        {row.fixtureCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResync(row)}
                          isLoading={syncingId === row.id}
                          icon={<RefreshCw />}
                        >
                          Resync
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="lg:hidden flex flex-col divide-y divide-[color:var(--color-ink-700)]">
            {rows.length === 0 ? (
              <div className="px-5 py-16 text-center font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]">
                No competitions on record
              </div>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CompetitionBadge logoUrl={row.logoUrl} name={row.name} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[color:var(--color-ink-50)] truncate">
                          {row.name}
                        </div>
                        <div className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] mt-0.5">
                          ID {row.id.toString().padStart(3, '0')}
                          {row.type ? ` · ${row.type}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className={`chip ${row.active ? 'chip-volt' : ''}`}>
                      {row.active ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <MobileMeta label="Country" value={row.countryName ?? '—'} />
                    <MobileMeta
                      label="Season"
                      mono
                      value={`${row.seasonYear}/${(row.seasonYear + 1) % 100}`}
                    />
                    <MobileMeta
                      label="Last sync"
                      mono
                      value={formatDateTime(row.lastSyncedAt)}
                    />
                    <MobileMeta
                      label="Leagues"
                      mono
                      value={`${row.activeLeagueCount} / ${row.leagueCount}`}
                      emphasis
                    />
                    <MobileMeta
                      label="Fixtures"
                      mono
                      value={row.fixtureCount.toLocaleString()}
                    />
                  </dl>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[0.6rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                        Sync
                      </span>
                      <ActiveSwitch
                        checked={row.active}
                        disabled={togglingId === row.id}
                        onToggle={() => handleToggleActive(row)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResync(row)}
                      isLoading={syncingId === row.id}
                      icon={<RefreshCw />}
                    >
                      Resync
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {bootstrapResult && (
        <BootstrapResultModal
          result={bootstrapResult}
          onClose={() => setBootstrapResult(null)}
        />
      )}
    </div>
  );
}

/* ---------- Small helpers ---------- */

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

function CompetitionBadge({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  if (logoUrl) {
    return (
      <div className="w-10 h-10 rounded-lg bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] grid place-items-center shrink-0 overflow-hidden">
        <img
          src={logoUrl}
          alt={`${name} crest`}
          className="w-7 h-7 object-contain"
        />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] grid place-items-center shrink-0">
      <Trophy className="w-4 h-4 text-[color:var(--color-ink-400)]" />
    </div>
  );
}

function ActiveSwitch({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? 'bg-[color:var(--color-volt-200)]/20 border-[color:var(--color-volt-200)]/60'
          : 'bg-[color:var(--color-ink-800)] border-[color:var(--color-ink-600)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
          checked
            ? 'translate-x-6 bg-[color:var(--color-volt-200)] shadow-[0_0_12px_rgba(215,255,61,0.6)]'
            : 'translate-x-1 bg-[color:var(--color-ink-500)]'
        }`}
      />
    </button>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur px-5 py-4">
      <p className="font-mono text-[0.58rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
        {label}
      </p>
      <p
        className={`mt-2 scoreboard text-3xl sm:text-4xl leading-none ${
          accent
            ? 'text-[color:var(--color-volt-200)]'
            : 'text-[color:var(--color-ink-50)]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MobileMeta({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[0.58rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm ${mono ? 'font-mono tabular-nums' : ''} ${
          emphasis
            ? 'text-[color:var(--color-volt-200)]'
            : 'text-[color:var(--color-ink-50)]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-7 h-7 text-[color:var(--color-volt-200)] animate-spin" />
      <p className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)]">
        Loading registry…
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

/* ---------- Modal ---------- */

function BootstrapResultModal({
  result,
  onClose,
}: {
  result: BootstrapResult;
  onClose: () => void;
}) {
  const usedPct =
    result.dailyLimit > 0
      ? Math.min(100, Math.round((result.apiCallsUsedLast24h / result.dailyLimit) * 100))
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-ink-950)]/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)] overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-[color:var(--color-ink-700)]">
          <div aria-hidden className="absolute inset-0 hatch opacity-50" />
          <div className="relative flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg grid place-items-center border border-[color:var(--color-win-500)]/40 bg-[color:var(--color-win-500)]/10">
              <CheckCircle2 className="w-5 h-5 text-[color:var(--color-win-500)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[0.62rem] tracking-[0.28em] uppercase text-[color:var(--color-win-500)]">
                / Sync complete
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl tracking-wide text-[color:var(--color-ink-50)] leading-tight">
                {result.name}
              </h2>
              <p className="mt-1 font-mono text-[0.7rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-300)]">
                Season {result.seasonYear}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-50)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          <ModalStat label="Teams" value={result.teamCount.toLocaleString()} />
          <ModalStat
            label="Fixtures"
            value={result.fixtureCount.toLocaleString()}
          />
          <ModalStat
            label="Squad links"
            value={result.activeSquadLinkCount.toLocaleString()}
          />
          <ModalStat
            label="Duration"
            value={`${(result.durationMs / 1000).toFixed(1)}s`}
          />
        </div>

        {/* Budget warning */}
        <div className="mx-6 mb-5 rounded-xl border border-[color:var(--color-draw-500)]/40 bg-[color:var(--color-draw-500)]/8 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[color:var(--color-draw-500)] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[0.6rem] tracking-[0.22em] uppercase text-[color:var(--color-draw-500)]">
              Budget · last 24h
            </p>
            <p className="mt-1 text-sm text-[color:var(--color-ink-50)]">
              <span className="font-mono tabular-nums font-semibold">
                {result.apiCallsUsedLast24h}
              </span>{' '}
              <span className="text-[color:var(--color-ink-400)]">
                / {result.dailyLimit}
              </span>{' '}
              <span className="chip chip-draw ml-1">{usedPct}%</span>
            </p>
            <p className="mt-1.5 text-xs text-[color:var(--color-ink-300)]">
              Each sync draws from the daily budget. Avoid frequent resyncs.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/50 px-4 py-3">
      <p className="font-mono text-[0.58rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-300)]">
        {label}
      </p>
      <p className="mt-1 scoreboard text-2xl text-[color:var(--color-ink-50)] leading-none">
        {value}
      </p>
    </div>
  );
}
