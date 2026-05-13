import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { getApiCallLog, getSyncStatus } from '../../api/admin';
import { Button } from '../../components/ui/Button';
import type { ApiCallLogEntry, SyncStatus } from '../../types/admin';

function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

type StatusTone = 'win' | 'draw' | 'loss' | 'neutral';

function statusTone(code: number | null): StatusTone {
  if (code === null || code < 0) return 'loss';
  if (code >= 500) return 'loss';
  if (code >= 400) return 'draw';
  if (code >= 200 && code < 300) return 'win';
  return 'neutral';
}

function statusChipClass(tone: StatusTone): string {
  switch (tone) {
    case 'win':
      return 'chip chip-win';
    case 'draw':
      return 'chip chip-draw';
    case 'loss':
      return 'chip chip-loss';
    default:
      return 'chip';
  }
}

function budgetTone(pct: number): {
  bar: string;
  text: string;
  chip: string;
  label: string;
} {
  if (pct >= 80) {
    return {
      bar: 'bg-[color:var(--color-loss-500)]',
      text: 'text-[color:var(--color-loss-500)]',
      chip: 'chip chip-loss',
      label: 'Critical',
    };
  }
  if (pct >= 60) {
    return {
      bar: 'bg-[color:var(--color-draw-500)]',
      text: 'text-[color:var(--color-draw-500)]',
      chip: 'chip chip-draw',
      label: 'Elevated',
    };
  }
  return {
    bar: 'bg-[color:var(--color-volt-200)]',
    text: 'text-[color:var(--color-volt-200)]',
    chip: 'chip chip-volt',
    label: 'Nominal',
  };
}

export function AdminBudgetPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [log, setLog] = useState<ApiCallLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statusRes, logRes] = await Promise.all([
        getSyncStatus(),
        getApiCallLog(100),
      ]);
      setStatus(statusRes);
      setLog(logRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load budget data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const endpointCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of log) {
      counts.set(entry.endpoint, (counts.get(entry.endpoint) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count);
  }, [log]);

  const maxEndpointCount = endpointCounts[0]?.count ?? 0;

  const errorCount = useMemo(
    () =>
      log.filter((e) => {
        const t = statusTone(e.statusCode);
        return t === 'loss' || t === 'draw';
      }).length,
    [log]
  );

  const pct =
    status && status.dailyLimit > 0
      ? Math.min(100, (status.apiCallsUsedLast24h / status.dailyLimit) * 100)
      : 0;
  const tones = budgetTone(pct);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-fade-up">
        <div>
          <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
            / Budget
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
            API call budget
          </h1>
          <p className="mt-4 text-sm text-[color:var(--color-ink-200)] max-w-xl">
            Live readout of the daily upstream quota and the tail of recent
            provider calls. Monitor pressure before it breaches ceiling.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          icon={<RefreshCw className={isLoading ? 'animate-spin' : ''} />}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </header>

      {isLoading && !status ? (
        <LoadingBlock />
      ) : error ? (
        <AlertBanner tone="loss" message={error} />
      ) : status ? (
        <>
          {/* Scoreboard tiles */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger">
            <ScoreTile
              label="Used · 24h"
              value={status.apiCallsUsedLast24h.toLocaleString()}
              sub={`of ${status.dailyLimit.toLocaleString()}`}
              accentClass={tones.text}
              huge
            />
            <ScoreTile
              label="Utilization"
              value={`${pct.toFixed(0)}%`}
              sub={tones.label}
              accentClass={tones.text}
            />
            <ScoreTile
              label="Active comps"
              value={status.activeCompetitions.length
                .toString()
                .padStart(2, '0')}
              sub="tracked"
              accentClass="text-[color:var(--color-ink-50)]"
            />
            <ScoreTile
              label="Errors · tail"
              value={errorCount.toString().padStart(2, '0')}
              sub={`of last ${log.length}`}
              accentClass={
                errorCount > 0
                  ? 'text-[color:var(--color-loss-500)]'
                  : 'text-[color:var(--color-ink-50)]'
              }
            />
          </section>

          {/* Budget gauge */}
          <section className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur overflow-hidden">
            <div className="px-5 sm:px-6 py-5 border-b border-[color:var(--color-ink-700)] flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
                  / Gauge
                </p>
                <h2 className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)] mt-0.5">
                  24-hour pressure
                </h2>
              </div>
              <span className={tones.chip}>{tones.label}</span>
            </div>
            <div className="px-5 sm:px-6 py-6 space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className={`scoreboard text-5xl sm:text-6xl leading-none ${tones.text}`}>
                    {status.apiCallsUsedLast24h.toLocaleString()}
                    <span className="text-[color:var(--color-ink-400)] text-2xl sm:text-3xl ml-2 font-mono">
                      / {status.dailyLimit.toLocaleString()}
                    </span>
                  </p>
                  <p className="mt-2 font-mono text-[0.62rem] tracking-[0.26em] uppercase text-[color:var(--color-ink-300)]">
                    Calls used · last 24 hours
                  </p>
                </div>
                <div className="text-right">
                  <p className={`scoreboard text-4xl ${tones.text}`}>
                    {pct.toFixed(0)}%
                  </p>
                  <p className="mt-1 font-mono text-[0.58rem] tracking-[0.26em] uppercase text-[color:var(--color-ink-400)]">
                    Utilization
                  </p>
                </div>
              </div>

              <div
                className="relative w-full h-3 rounded-full overflow-hidden bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)]"
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`absolute inset-y-0 left-0 ${tones.bar} transition-[width] duration-500`}
                  style={{ width: `${pct}%` }}
                />
                <div className="absolute inset-0 tick-divider opacity-60 pointer-events-none" />
              </div>

              {status.activeCompetitions.length > 0 && (
                <div className="pt-4 border-t border-[color:var(--color-ink-700)]">
                  <p className="font-mono text-[0.6rem] tracking-[0.26em] uppercase text-[color:var(--color-ink-300)] mb-3">
                    Active competitions ({status.activeCompetitions.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {status.activeCompetitions.map((c) => (
                      <span
                        key={c.competitionId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/70 text-xs text-[color:var(--color-ink-100)]"
                        title={`Teams: ${c.teamCount} · Fixtures: ${c.fixtureCount}`}
                      >
                        <span
                          aria-hidden
                          className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--color-volt-200)]"
                        />
                        <span className="font-medium">{c.name}</span>
                        <span className="font-mono text-[0.62rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-400)]">
                          {c.seasonYear}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Endpoints histogram */}
          <section className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur overflow-hidden">
            <div className="px-5 sm:px-6 py-5 border-b border-[color:var(--color-ink-700)] flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
                  / Distribution
                </p>
                <h2 className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)] mt-0.5">
                  Calls by endpoint
                </h2>
              </div>
              <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                {endpointCounts.length} routes
              </span>
            </div>
            <div className="px-5 sm:px-6 py-5">
              {endpointCounts.length === 0 ? (
                <p className="font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)] py-6 text-center">
                  No API calls logged
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {endpointCounts.map(({ endpoint, count }) => {
                    const barPct =
                      maxEndpointCount > 0
                        ? (count / maxEndpointCount) * 100
                        : 0;
                    return (
                      <li
                        key={endpoint}
                        className="flex items-center gap-3 sm:gap-4"
                      >
                        <div className="w-40 sm:w-60 md:w-72 shrink-0 font-mono text-[0.72rem] text-[color:var(--color-ink-100)] truncate">
                          {endpoint}
                        </div>
                        <div className="flex-1 h-5 rounded bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:var(--color-volt-300)] to-[color:var(--color-volt-200)] transition-[width] duration-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <div className="w-12 sm:w-14 text-right font-mono tabular-nums text-sm font-semibold text-[color:var(--color-ink-50)]">
                          {count}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Request log */}
          <section className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur overflow-hidden">
            <div className="px-5 sm:px-6 py-5 border-b border-[color:var(--color-ink-700)] flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
                  / Request log
                </p>
                <h2 className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)] mt-0.5">
                  Recent calls
                </h2>
              </div>
              <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] hidden sm:inline-flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--color-win-500)] animate-volt-pulse" />
                Tail {log.length}
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--color-ink-700)]">
                    <Th>When</Th>
                    <Th>Endpoint</Th>
                    <Th align="right">Comp</Th>
                    <Th>Status</Th>
                    <Th>Note</Th>
                  </tr>
                </thead>
                <tbody>
                  {log.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-16 text-center font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]"
                      >
                        No API calls logged yet
                      </td>
                    </tr>
                  ) : (
                    log.map((entry) => {
                      const tone = statusTone(entry.statusCode);
                      return (
                        <tr
                          key={entry.id}
                          className="border-b border-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-800)]/40 transition-colors"
                        >
                          <td
                            className="px-4 py-3 font-mono tabular-nums text-[0.72rem] text-[color:var(--color-ink-100)] whitespace-nowrap"
                            title={formatAbsolute(entry.calledAt)}
                          >
                            {formatRelative(entry.calledAt)}
                          </td>
                          <td className="px-4 py-3 font-mono text-[0.72rem] text-[color:var(--color-ink-50)] max-w-[26rem] truncate">
                            {entry.endpoint}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-[color:var(--color-ink-200)]">
                            {entry.competitionId ?? (
                              <span className="text-[color:var(--color-ink-500)]">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={statusChipClass(tone)}>
                              {entry.statusCode === null || entry.statusCode < 0
                                ? 'ERR'
                                : entry.statusCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[color:var(--color-ink-200)] max-w-md truncate">
                            {entry.note ?? (
                              <span className="text-[color:var(--color-ink-500)]">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked rows */}
            <div className="md:hidden flex flex-col divide-y divide-[color:var(--color-ink-700)]">
              {log.length === 0 ? (
                <div className="px-5 py-16 text-center font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]">
                  No API calls logged yet
                </div>
              ) : (
                log.map((entry) => {
                  const tone = statusTone(entry.statusCode);
                  return (
                    <div key={entry.id} className="px-5 py-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="font-mono tabular-nums text-[0.7rem] text-[color:var(--color-ink-200)]"
                          title={formatAbsolute(entry.calledAt)}
                        >
                          {formatRelative(entry.calledAt)}
                        </span>
                        <span className={statusChipClass(tone)}>
                          {entry.statusCode === null || entry.statusCode < 0
                            ? 'ERR'
                            : entry.statusCode}
                        </span>
                      </div>
                      <p className="font-mono text-[0.72rem] text-[color:var(--color-ink-50)] break-all">
                        {entry.endpoint}
                      </p>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-mono tracking-[0.18em] uppercase text-[color:var(--color-ink-400)]">
                          Comp{' '}
                          <span className="text-[color:var(--color-ink-200)]">
                            {entry.competitionId ?? '—'}
                          </span>
                        </span>
                        {entry.note && (
                          <span className="text-[color:var(--color-ink-300)] truncate text-right">
                            {entry.note}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
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

function ScoreTile({
  label,
  value,
  sub,
  accentClass,
  huge,
}: {
  label: string;
  value: string;
  sub?: string;
  accentClass: string;
  huge?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur px-5 py-4">
      <p className="font-mono text-[0.58rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
        {label}
      </p>
      <p
        className={`mt-2 scoreboard leading-none ${accentClass} ${
          huge ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-2 font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)]">
          {sub}
        </p>
      )}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="py-24 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-7 h-7 text-[color:var(--color-volt-200)] animate-spin" />
      <p className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)]">
        Loading telemetry…
      </p>
    </div>
  );
}

function AlertBanner({
  tone,
  message,
}: {
  tone: 'loss' | 'draw';
  message: string;
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
    </div>
  );
}
