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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-indigo-600" /> Competitions
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Manage active competitions and trigger manual syncs.
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
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Competition
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Country
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Season
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Active
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Last sync
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Leagues
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Fixtures
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No competitions found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {row.logoUrl ? (
                            <img
                              src={row.logoUrl}
                              alt=""
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {row.name}
                            </div>
                            {row.type && (
                              <div className="text-xs text-gray-500">
                                {row.type}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.countryName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.seasonYear}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={row.active}
                          disabled={togglingId === row.id}
                          onClick={() => handleToggleActive(row)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                            row.active ? 'bg-indigo-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              row.active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDateTime(row.lastSyncedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        <span className="font-medium">{row.activeLeagueCount}</span>
                        <span className="text-gray-400"> / {row.leagueCount}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {row.fixtureCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResync(row)}
                          isLoading={syncingId === row.id}
                          icon={<RefreshCw className="w-4 h-4" />}
                        >
                          Resync now
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Sync complete</h2>
            <p className="text-sm text-gray-600">
              {result.name} ({result.seasonYear})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <dt className="text-xs text-gray-500">Teams</dt>
            <dd className="text-lg font-semibold text-gray-900">
              {result.teamCount}
            </dd>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <dt className="text-xs text-gray-500">Fixtures</dt>
            <dd className="text-lg font-semibold text-gray-900">
              {result.fixtureCount}
            </dd>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <dt className="text-xs text-gray-500">Active squad links</dt>
            <dd className="text-lg font-semibold text-gray-900">
              {result.activeSquadLinkCount}
            </dd>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <dt className="text-xs text-gray-500">Duration</dt>
            <dd className="text-lg font-semibold text-gray-900">
              {(result.durationMs / 1000).toFixed(1)}s
            </dd>
          </div>
        </dl>

        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold">
              API calls used: {result.apiCallsUsedLast24h} / {result.dailyLimit} ({usedPct}%)
            </p>
            <p className="mt-0.5">
              Each sync consumes API calls against the daily budget. Avoid
              frequent resyncs.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
