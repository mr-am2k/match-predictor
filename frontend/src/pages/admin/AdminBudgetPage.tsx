import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Gauge, Loader2, RefreshCw } from 'lucide-react';
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

function statusColorClasses(code: number | null): string {
  if (code === null || code < 0) return 'bg-red-100 text-red-700';
  if (code >= 500) return 'bg-red-100 text-red-700';
  if (code >= 400) return 'bg-amber-100 text-amber-700';
  if (code >= 200 && code < 300) return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-700';
}

function budgetColor(pct: number): { bar: string; text: string; badge: string } {
  if (pct >= 80) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
    };
  }
  if (pct >= 60) {
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
    };
  }
  return {
    bar: 'bg-green-500',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gauge className="w-6 h-6 text-indigo-600" /> Budget
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Daily API call budget and recent activity.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          icon={<RefreshCw className="w-4 h-4" />}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {isLoading && !status ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : status ? (
        <>
          <BudgetGauge status={status} />

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Calls by endpoint
            </h2>
            {endpointCounts.length === 0 ? (
              <p className="text-sm text-gray-500">No API calls logged.</p>
            ) : (
              <div className="space-y-2">
                {endpointCounts.map(({ endpoint, count }) => {
                  const pct =
                    maxEndpointCount > 0
                      ? (count / maxEndpointCount) * 100
                      : 0;
                  return (
                    <div key={endpoint} className="flex items-center gap-3">
                      <div className="w-64 flex-shrink-0 text-sm font-mono text-gray-700 truncate">
                        {endpoint}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-indigo-500 rounded transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-medium text-gray-700">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent API calls
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing last {log.length} entries.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      When
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Endpoint
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Competition
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {log.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-gray-500"
                      >
                        No API calls logged yet.
                      </td>
                    </tr>
                  ) : (
                    log.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td
                          className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                          title={formatAbsolute(entry.calledAt)}
                        >
                          {formatRelative(entry.calledAt)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">
                          {entry.endpoint}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {entry.competitionId ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColorClasses(
                              entry.statusCode
                            )}`}
                          >
                            {entry.statusCode === null || entry.statusCode < 0
                              ? 'ERR'
                              : entry.statusCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                          {entry.note ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function BudgetGauge({ status }: { status: SyncStatus }) {
  const { apiCallsUsedLast24h, dailyLimit } = status;
  const pct =
    dailyLimit > 0
      ? Math.min(100, (apiCallsUsedLast24h / dailyLimit) * 100)
      : 0;
  const colors = budgetColor(pct);

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <div>
          <p className="text-sm text-gray-500">Used in last 24h</p>
          <p className={`text-3xl font-bold ${colors.text}`}>
            {apiCallsUsedLast24h}{' '}
            <span className="text-lg text-gray-400 font-medium">
              / {dailyLimit}
            </span>
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${colors.badge}`}
        >
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {status.activeCompetitions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Active competitions ({status.activeCompetitions.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {status.activeCompetitions.map((c) => (
              <span
                key={c.competitionId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs"
                title={`Teams: ${c.teamCount} · Fixtures: ${c.fixtureCount}`}
              >
                {c.name} ({c.seasonYear})
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
