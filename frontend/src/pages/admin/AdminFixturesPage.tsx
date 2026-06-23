import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { listAdminCompetitions } from '../../api/admin';
import {
  editFixtureResult,
  getAdminFixture,
  listAdminFixtures,
  listFixtureRounds,
} from '../../api/adminFixtures';
import { Button } from '../../components/ui/Button';
import type { AdminCompetition } from '../../types/admin';
import type {
  AdminFixtureDetail,
  AdminFixtureSummary,
  EditFixtureResultResponse,
} from '../../types/adminFixtures';
import type { PlayerSummary } from '../../types/prediction';

const FINAL_STATUSES = ['FT', 'AET', 'PEN'];

interface ScorerRow {
  key: string;
  playerId: number | '';
  goals: number;
  ownGoal: boolean;
}

interface AssisterRow {
  key: string;
  playerId: number | '';
  assists: number;
}

let rowSeq = 0;
const nextKey = () => `row-${rowSeq++}`;

export function AdminFixturesPage() {
  const [competitions, setCompetitions] = useState<AdminCompetition[]>([]);
  const [competitionId, setCompetitionId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);
  const [round, setRound] = useState<string>('');
  const [fixtures, setFixtures] = useState<AdminFixtureSummary[]>([]);

  const [loadingComps, setLoadingComps] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AdminFixtureDetail | null>(null);

  // Load competitions once.
  useEffect(() => {
    (async () => {
      setLoadingComps(true);
      try {
        const data = await listAdminCompetitions();
        setCompetitions(data);
        if (data.length > 0) setCompetitionId(data[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load competitions');
      } finally {
        setLoadingComps(false);
      }
    })();
  }, []);

  // Load rounds when competition changes.
  useEffect(() => {
    if (competitionId == null) return;
    setRound('');
    setRounds([]);
    (async () => {
      try {
        const data = await listFixtureRounds(competitionId);
        setRounds(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rounds');
      }
    })();
  }, [competitionId]);

  const loadFixtures = useCallback(async () => {
    if (competitionId == null) return;
    setLoadingFixtures(true);
    setError(null);
    try {
      const data = await listAdminFixtures(competitionId, round || undefined);
      setFixtures(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fixtures');
    } finally {
      setLoadingFixtures(false);
    }
  }, [competitionId, round]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  const openEditor = async (id: number) => {
    setError(null);
    try {
      const detail = await getAdminFixture(id);
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fixture');
    }
  };

  if (selected) {
    return (
      <FixtureEditor
        fixture={selected}
        onClose={() => setSelected(null)}
        onSaved={() => {
          setSelected(null);
          loadFixtures();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
          / Fixtures
        </p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
          Result editor
        </h1>
        <p className="mt-4 text-sm text-[color:var(--color-ink-200)] max-w-xl">
          Correct a match score, its scorers and assisters when the synced data
          is wrong. Saving recalculates every affected prediction and locks the
          fixture from future overwrites by the API sync.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <Field label="Competition">
          <select
            className="admin-select"
            value={competitionId ?? ''}
            disabled={loadingComps}
            onChange={(e) => setCompetitionId(Number(e.target.value))}
          >
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.seasonYear}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Round">
          <select
            className="admin-select"
            value={round}
            onChange={(e) => setRound(e.target.value)}
          >
            <option value="">All rounds</option>
            {rounds.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Button
          variant="outline"
          size="sm"
          onClick={loadFixtures}
          icon={<RefreshCw className={loadingFixtures ? 'animate-spin' : ''} />}
          disabled={loadingFixtures}
        >
          Refresh
        </Button>
      </div>

      {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

      {loadingFixtures && fixtures.length === 0 ? (
        <LoadingBlock />
      ) : (
        <section className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur overflow-hidden">
          <div className="flex flex-col divide-y divide-[color:var(--color-ink-700)]">
            {fixtures.length === 0 ? (
              <div className="px-5 py-16 text-center font-mono text-[0.7rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)]">
                No fixtures
              </div>
            ) : (
              fixtures.map((f) => (
                <button
                  key={f.id}
                  onClick={() => openEditor(f.id)}
                  className="flex items-center gap-4 px-5 py-4 text-left hover:bg-[color:var(--color-ink-800)]/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-[color:var(--color-ink-50)]">
                      <span className="truncate font-medium">
                        {f.homeTeam.name ?? `#${f.homeTeam.id}`}
                      </span>
                      <span className="font-mono tabular-nums text-[color:var(--color-volt-200)]">
                        {f.homeScore ?? '–'} : {f.awayScore ?? '–'}
                      </span>
                      <span className="truncate font-medium">
                        {f.awayTeam.name ?? `#${f.awayTeam.id}`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[0.58rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)]">
                      <span>{f.round}</span>
                      <span>· {f.status ?? '—'}</span>
                      <span>· {formatDateTime(f.kickoffAt)}</span>
                    </div>
                  </div>
                  {f.manuallyOverridden && (
                    <span className="chip chip-volt inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Edited
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- Editor ---------- */

function FixtureEditor({
  fixture,
  onClose,
  onSaved,
}: {
  fixture: AdminFixtureDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [homeScore, setHomeScore] = useState<number>(fixture.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState<number>(fixture.awayScore ?? 0);
  const [status, setStatus] = useState<string>(
    fixture.status && FINAL_STATUSES.includes(fixture.status) ? fixture.status : 'FT'
  );
  const [scorers, setScorers] = useState<ScorerRow[]>(
    fixture.scorers.map((s) => ({
      key: nextKey(),
      playerId: s.playerId,
      goals: s.count,
      ownGoal: s.ownGoal,
    }))
  );
  const [assisters, setAssisters] = useState<AssisterRow[]>(
    fixture.assisters.map((a) => ({
      key: nextKey(),
      playerId: a.playerId,
      assists: a.count,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EditFixtureResultResponse | null>(null);

  // playerId -> teamId, for building the request and looking up names.
  const teamByPlayer = useMemo(() => {
    const m = new Map<number, number>();
    fixture.homeRoster.forEach((p) => m.set(p.playerId, fixture.homeTeam.id ?? 0));
    fixture.awayRoster.forEach((p) => m.set(p.playerId, fixture.awayTeam.id ?? 0));
    // Players that appear in existing events but not the roster keep their event teamId.
    fixture.scorers.forEach((s) => {
      if (!m.has(s.playerId)) m.set(s.playerId, s.teamId);
    });
    fixture.assisters.forEach((a) => {
      if (!m.has(a.playerId)) m.set(a.playerId, a.teamId);
    });
    return m;
  }, [fixture]);

  const handleSave = async () => {
    setError(null);

    const scorerInputs = scorers
      .filter((s) => s.playerId !== '' && s.goals > 0)
      .map((s) => ({
        playerId: s.playerId as number,
        teamId: teamByPlayer.get(s.playerId as number) ?? 0,
        goals: s.goals,
        ownGoal: s.ownGoal,
      }));
    const assisterInputs = assisters
      .filter((a) => a.playerId !== '' && a.assists > 0)
      .map((a) => ({
        playerId: a.playerId as number,
        teamId: teamByPlayer.get(a.playerId as number) ?? 0,
        assists: a.assists,
      }));

    if (scorerInputs.some((s) => !s.teamId) || assisterInputs.some((a) => !a.teamId)) {
      setError('Could not resolve a team for one of the selected players.');
      return;
    }

    setSaving(true);
    try {
      const res = await editFixtureResult(fixture.id, {
        homeScore,
        awayScore,
        status,
        scorers: scorerInputs,
        assisters: assisterInputs,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save result');
    } finally {
      setSaving(false);
    }
  };

  const allPlayers = useMemo(
    () => [
      { team: fixture.homeTeam.name ?? 'Home', players: fixture.homeRoster },
      { team: fixture.awayTeam.name ?? 'Away', players: fixture.awayRoster },
    ],
    [fixture]
  );

  return (
    <div className="space-y-6">
      <button
        onClick={onClose}
        className="inline-flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to fixtures
      </button>

      <header className="animate-fade-up">
        <p className="font-mono text-[0.62rem] tracking-[0.28em] uppercase text-[color:var(--color-volt-200)] mb-2">
          / {fixture.round} · {fixture.status ?? '—'}
        </p>
        <h1 className="font-display text-4xl tracking-wide text-[color:var(--color-ink-50)]">
          {fixture.homeTeam.name ?? `#${fixture.homeTeam.id}`} v{' '}
          {fixture.awayTeam.name ?? `#${fixture.awayTeam.id}`}
        </h1>
      </header>

      {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

      <section className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/85 backdrop-blur p-5 sm:p-6 space-y-6">
        {/* Score + status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label={`${fixture.homeTeam.name ?? 'Home'} goals`}>
            <NumberInput value={homeScore} onChange={setHomeScore} />
          </Field>
          <Field label={`${fixture.awayTeam.name ?? 'Away'} goals`}>
            <NumberInput value={awayScore} onChange={setAwayScore} />
          </Field>
          <Field label="Status">
            <select
              className="admin-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {FINAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Scorers */}
        <EditList
          title="Goal scorers"
          onAdd={() =>
            setScorers((prev) => [
              ...prev,
              { key: nextKey(), playerId: '', goals: 1, ownGoal: false },
            ])
          }
        >
          {scorers.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-2">
              <PlayerSelect
                groups={allPlayers}
                value={row.playerId}
                onChange={(pid) =>
                  setScorers((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, playerId: pid } : r))
                  )
                }
              />
              <NumberInput
                value={row.goals}
                min={1}
                className="w-20"
                onChange={(v) =>
                  setScorers((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, goals: v } : r))
                  )
                }
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-[color:var(--color-ink-200)]">
                <input
                  type="checkbox"
                  checked={row.ownGoal}
                  onChange={(e) =>
                    setScorers((prev) =>
                      prev.map((r) =>
                        r.key === row.key ? { ...r, ownGoal: e.target.checked } : r
                      )
                    )
                  }
                />
                OG
              </label>
              <RemoveButton
                onClick={() =>
                  setScorers((prev) => prev.filter((r) => r.key !== row.key))
                }
              />
            </div>
          ))}
        </EditList>

        {/* Assisters */}
        <EditList
          title="Assisters"
          onAdd={() =>
            setAssisters((prev) => [
              ...prev,
              { key: nextKey(), playerId: '', assists: 1 },
            ])
          }
        >
          {assisters.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-2">
              <PlayerSelect
                groups={allPlayers}
                value={row.playerId}
                onChange={(pid) =>
                  setAssisters((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, playerId: pid } : r))
                  )
                }
              />
              <NumberInput
                value={row.assists}
                min={1}
                className="w-20"
                onChange={(v) =>
                  setAssisters((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, assists: v } : r))
                  )
                }
              />
              <RemoveButton
                onClick={() =>
                  setAssisters((prev) => prev.filter((r) => r.key !== row.key))
                }
              />
            </div>
          ))}
        </EditList>

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={saving}
            icon={<Save />}
          >
            Save & recalculate
          </Button>
        </div>
      </section>

      {result && (
        <ResultModal
          result={result}
          onClose={() => {
            setResult(null);
            onSaved();
          }}
        />
      )}
    </div>
  );
}

/* ---------- Small components ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[0.58rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)] block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      className={`h-10 px-3 rounded-lg bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-600)] text-[color:var(--color-ink-50)] font-mono tabular-nums focus:outline-none focus:border-[color:var(--color-volt-200)]/60 ${className}`}
    />
  );
}

function PlayerSelect({
  groups,
  value,
  onChange,
}: {
  groups: { team: string; players: PlayerSummary[] }[];
  value: number | '';
  onChange: (playerId: number | '') => void;
}) {
  return (
    <select
      className="admin-select flex-1 min-w-[12rem]"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    >
      <option value="">Select player…</option>
      {groups.map((g) => (
        <optgroup key={g.team} label={g.team}>
          {g.players.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function EditList({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[0.62rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-300)]">
          {title}
        </h3>
        <Button variant="ghost" size="sm" onClick={onAdd} icon={<Plus />}>
          Add
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="h-10 w-10 grid place-items-center rounded-lg border border-[color:var(--color-ink-700)] text-[color:var(--color-ink-400)] hover:text-[color:var(--color-loss-500)] hover:border-[color:var(--color-loss-500)]/50 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

function LoadingBlock() {
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-7 h-7 text-[color:var(--color-volt-200)] animate-spin" />
      <p className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)]">
        Loading…
      </p>
    </div>
  );
}

function AlertBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)]"
      role="alert"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function ResultModal({
  result,
  onClose,
}: {
  result: EditFixtureResultResponse;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-ink-950)]/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)] p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg grid place-items-center border border-[color:var(--color-win-500)]/40 bg-[color:var(--color-win-500)]/10">
            <CheckCircle2 className="w-5 h-5 text-[color:var(--color-win-500)]" />
          </div>
          <div className="flex-1">
            <p className="font-mono text-[0.62rem] tracking-[0.28em] uppercase text-[color:var(--color-win-500)]">
              / Result saved
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-wide text-[color:var(--color-ink-50)]">
              {result.homeScore} : {result.awayScore} · {result.status}
            </h2>
            <p className="mt-3 text-sm text-[color:var(--color-ink-200)]">
              Recalculated{' '}
              <span className="font-semibold text-[color:var(--color-volt-200)]">
                {result.predictionsRescored}
              </span>{' '}
              prediction{result.predictionsRescored === 1 ? '' : 's'}.
              {result.overallRescored
                ? ' Season-long (overall) predictions were also recomputed.'
                : ''}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}
