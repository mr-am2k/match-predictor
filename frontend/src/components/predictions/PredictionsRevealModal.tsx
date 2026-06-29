import {
  AlertCircle,
  ChevronDown,
  Crown,
  Lock,
  Target,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getFixturePredictions } from '../../api/predictions';
import type {
  FixturePredictions,
  FixtureWithPrediction,
  OtherPrediction,
  PlayerPickView,
} from '../../types/prediction';
import { LockCountdown } from './LockCountdown';
import { PointsBreakdown } from './PointsBreakdown';

interface PredictionsRevealModalProps {
  fixture: FixtureWithPrediction;
  leagueId: string;
  open: boolean;
  onClose: () => void;
}

const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN']);

type Outcome = 'home' | 'draw' | 'away' | 'none';

function outcomeOf(
  prediction: Pick<OtherPrediction, 'predictedDraw' | 'winnerTeamId'>,
  homeTeamId: number,
  awayTeamId: number
): Outcome {
  if (prediction.predictedDraw) return 'draw';
  if (prediction.winnerTeamId === homeTeamId) return 'home';
  if (prediction.winnerTeamId === awayTeamId) return 'away';
  return 'none';
}

// Compact crest used throughout the reveal.
function Crest({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string;
  logoUrl: string | null;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'w-7 h-7' : 'w-11 h-11';
  const img = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
  const txt = size === 'sm' ? 'text-xs' : 'text-lg';
  return (
    <div
      className={`${box} rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)] flex items-center justify-center overflow-hidden flex-shrink-0`}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="" className={`${img} object-contain`} />
      ) : (
        <span
          className={`font-display ${txt} text-[color:var(--color-ink-200)] leading-none`}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// The signature broadcast moment: a three-segment meter of how the room split.
function ConsensusMeter({
  fixture,
  predictions,
}: {
  fixture: FixtureWithPrediction;
  predictions: OtherPrediction[];
}) {
  const tally = useMemo(() => {
    let home = 0;
    let draw = 0;
    let away = 0;
    for (const p of predictions) {
      const o = outcomeOf(p, fixture.homeTeam.id, fixture.awayTeam.id);
      if (o === 'home') home += 1;
      else if (o === 'draw') draw += 1;
      else if (o === 'away') away += 1;
    }
    return { home, draw, away, total: home + draw + away };
  }, [predictions, fixture.homeTeam.id, fixture.awayTeam.id]);

  const topScoreline = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of predictions) {
      if (p.homeScore == null || p.awayScore == null) continue;
      const key = `${p.homeScore}-${p.awayScore}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best: { key: string; count: number } | null = null;
    for (const [key, count] of counts) {
      if (!best || count > best.count) best = { key, count };
    }
    return best;
  }, [predictions]);

  if (tally.total === 0) {
    return (
      <p className="font-mono text-[0.62rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-400)]">
        No outcome picks to compare
      </p>
    );
  }

  const pct = (n: number) => Math.round((n / tally.total) * 100);
  const segments = [
    {
      key: 'home',
      label: fixture.homeTeam.name,
      value: tally.home,
      color: 'var(--color-volt-200)',
      align: 'text-left',
    },
    {
      key: 'draw',
      label: 'Draw',
      value: tally.draw,
      color: 'var(--color-draw-500)',
      align: 'text-center',
    },
    {
      key: 'away',
      label: fixture.awayTeam.name,
      value: tally.away,
      color: 'var(--color-win-500)',
      align: 'text-right',
    },
  ];

  return (
    <div>
      {/* Labels */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {segments.map((s) => (
          <div key={s.key} className={s.align}>
            <p
              className="font-mono text-[0.55rem] tracking-[0.2em] uppercase truncate"
              style={{ color: s.color }}
            >
              {s.label}
            </p>
            <p className="scoreboard text-xl text-[color:var(--color-ink-50)] leading-none mt-1">
              {pct(s.value)}
              <span className="text-[0.7rem] text-[color:var(--color-ink-400)] align-top ml-0.5">
                %
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Meter */}
      <div className="h-2.5 rounded-full overflow-hidden flex bg-[color:var(--color-ink-900)] border border-[color:var(--color-ink-700)]">
        {segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.key}
              className="h-full transition-[width] duration-700 ease-out"
              style={{
                width: `${(s.value / tally.total) * 100}%`,
                background: s.color,
              }}
              title={`${s.label}: ${s.value}`}
            />
          ) : null
        )}
      </div>

      {/* Most-backed scoreline */}
      {topScoreline && (
        <div className="mt-3 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[color:var(--color-ink-400)]" />
          <span className="font-mono text-[0.58rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-400)]">
            Most-backed score
          </span>
          <span className="scoreboard text-sm text-[color:var(--color-volt-200)] tabular-nums">
            {topScoreline.key.replace('-', ' – ')}
          </span>
          <span className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)]">
            ×{topScoreline.count}
          </span>
        </div>
      )}
    </div>
  );
}

function PickChips({
  label,
  picks,
}: {
  label: string;
  picks: PlayerPickView[];
}) {
  if (picks.length === 0) return null;
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="font-mono text-[0.52rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)] pt-1">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {picks.map((p) => (
          <span
            key={p.playerId}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60 text-[0.7rem] text-[color:var(--color-ink-100)]"
          >
            {p.name}
            {p.count > 1 && (
              <span className="font-mono text-[0.6rem] text-[color:var(--color-volt-200)]">
                ×{p.count}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function PredictionSlip({
  prediction,
  fixture,
  isFinal,
  isLeader,
  index,
}: {
  prediction: OtherPrediction;
  fixture: FixtureWithPrediction;
  isFinal: boolean;
  isLeader: boolean;
  index: number;
}) {
  const outcome = outcomeOf(
    prediction,
    fixture.homeTeam.id,
    fixture.awayTeam.id
  );
  const me = prediction.isCurrentUser;
  // Expand your own breakdown by default; others collapsed to keep the list scannable.
  const [showBreakdown, setShowBreakdown] = useState(me);

  const outcomeChip =
    outcome === 'home'
      ? { label: `${fixture.homeTeam.name} win`, cls: 'chip chip-win' }
      : outcome === 'away'
        ? { label: `${fixture.awayTeam.name} win`, cls: 'chip chip-win' }
        : outcome === 'draw'
          ? { label: 'Draw', cls: 'chip chip-draw' }
          : null;

  const hasScore =
    prediction.homeScore != null && prediction.awayScore != null;
  const exactHit =
    isFinal &&
    hasScore &&
    fixture.homeScore === prediction.homeScore &&
    fixture.awayScore === prediction.awayScore;

  const pts = prediction.points;

  return (
    <article
      className={`
        relative rounded-xl border p-4 animate-fade-up
        ${
          me
            ? 'border-[color:var(--color-volt-200)]/45 bg-[color:var(--color-volt-200)]/[0.04] volt-glow-sm'
            : 'border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/40'
        }
      `}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display text-lg leading-none
            ${
              me
                ? 'bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)]'
                : 'bg-[color:var(--color-ink-800)] text-[color:var(--color-ink-100)] border border-[color:var(--color-ink-700)]'
            }`}
        >
          {prediction.username.charAt(0).toUpperCase()}
          {isLeader && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[color:var(--color-draw-500)] flex items-center justify-center shadow-md">
              <Crown className="w-3 h-3 text-[color:var(--color-ink-950)]" />
            </span>
          )}
        </div>

        {/* Name + outcome */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-base tracking-wide text-[color:var(--color-ink-50)] truncate leading-none">
              {prediction.username}
            </p>
            {me && (
              <span className="font-mono text-[0.5rem] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] leading-none">
                You
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {outcomeChip ? (
              <span className={outcomeChip.cls}>{outcomeChip.label}</span>
            ) : (
              <span className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-500)] italic">
                Outcome left open
              </span>
            )}
            {exactHit && (
              <span className="chip chip-volt">
                <Target className="w-3 h-3" />
                Exact
              </span>
            )}
            {outcome === 'draw' && prediction.penaltyWinnerTeamId != null && (
              <span className="chip chip-draw">
                Pens:{' '}
                {prediction.penaltyWinnerTeamId === fixture.homeTeam.id
                  ? fixture.homeTeam.name
                  : fixture.awayTeam.name}
              </span>
            )}
          </div>
        </div>

        {/* Scoreline */}
        <div className="flex flex-col items-center px-1 flex-shrink-0">
          {hasScore ? (
            <span className="scoreboard text-2xl text-[color:var(--color-ink-50)] tabular-nums leading-none">
              {prediction.homeScore}
              <span className="text-[color:var(--color-ink-500)] mx-1">–</span>
              {prediction.awayScore}
            </span>
          ) : (
            <span className="font-display text-xl text-[color:var(--color-ink-600)]">
              VS
            </span>
          )}
        </div>

        {/* Points (settled only) */}
        {pts != null && (
          <div
            className={`flex flex-col items-center justify-center w-14 flex-shrink-0 rounded-lg border py-1.5
              ${
                pts > 0
                  ? 'border-[color:var(--color-win-500)]/40 bg-[color:var(--color-win-500)]/10'
                  : 'border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60'
              }`}
          >
            <span
              className={`scoreboard text-xl leading-none ${
                pts > 0
                  ? 'text-[color:var(--color-win-500)]'
                  : 'text-[color:var(--color-ink-400)]'
              }`}
            >
              {pts > 0 ? `+${pts}` : pts}
            </span>
            <span className="font-mono text-[0.45rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)] mt-0.5">
              pts
            </span>
          </div>
        )}
      </div>

      {/* Scorers / assisters */}
      {(prediction.scorers.length > 0 || prediction.assisters.length > 0) && (
        <div className="mt-3 pt-3 border-t border-dashed border-[color:var(--color-ink-700)] space-y-2">
          <PickChips label="Scorers" picks={prediction.scorers} />
          <PickChips label="Assists" picks={prediction.assisters} />
        </div>
      )}

      {/* Points breakdown (settled fixtures only) */}
      {prediction.breakdown && (
        <div className="mt-3 pt-3 border-t border-dashed border-[color:var(--color-ink-700)]">
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            className="w-full flex items-center gap-1.5 font-mono text-[0.58rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showBreakdown ? 'rotate-180' : ''
              }`}
            />
            {showBreakdown ? 'Hide' : 'Show'} how {me ? 'you' : 'they'} scored
          </button>
          {showBreakdown && (
            <div className="mt-3">
              <PointsBreakdown breakdown={prediction.breakdown} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function PredictionsRevealModal({
  fixture,
  leagueId,
  open,
  onClose,
}: PredictionsRevealModalProps) {
  const [data, setData] = useState<FixturePredictions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFinal = FINAL_STATUSES.has(fixture.status);
  const showActualScore =
    isFinal && fixture.homeScore != null && fixture.awayScore != null;

  // Close on Escape + body scroll lock
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  // Fetch on open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    getFixturePredictions(leagueId, fixture.id)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load picks');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, leagueId, fixture.id]);

  // Highest scorer in the room (settled only) — gets the crown.
  const leaderUserId = useMemo(() => {
    if (!data) return null;
    let best: OtherPrediction | null = null;
    for (const p of data.predictions) {
      if (p.points == null || p.points <= 0) continue;
      if (!best || p.points > (best.points ?? 0)) best = p;
    }
    return best?.userId ?? null;
  }, [data]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[color:var(--color-ink-950)]/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      aria-hidden={false}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col
          bg-[color:var(--color-ink-850)] border border-[color:var(--color-ink-700)]
          rounded-t-3xl sm:rounded-2xl overflow-hidden
          shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]
          animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="predictions-reveal-title"
      >
        {/* Drag handle on mobile */}
        <div aria-hidden className="sm:hidden flex justify-center pt-2 pb-1">
          <span className="w-10 h-1 rounded-full bg-[color:var(--color-ink-600)]" />
        </div>

        {/* Header */}
        <header className="relative px-5 sm:px-8 pt-4 sm:pt-6 pb-5 border-b border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60 stadium-mesh">
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-[color:var(--color-volt-200)]"
          />
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-volt-200)] mb-1.5 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                The room · {isFinal ? 'Results' : 'Picks revealed'}
              </p>
              <h2
                id="predictions-reveal-title"
                className="font-display text-2xl sm:text-3xl tracking-wide text-[color:var(--color-ink-50)] leading-none truncate"
              >
                {fixture.homeTeam.name}{' '}
                <span className="text-[color:var(--color-ink-500)]">VS</span>{' '}
                {fixture.awayTeam.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1 rounded-lg text-[color:var(--color-ink-300)] hover:bg-[color:var(--color-ink-800)] hover:text-[color:var(--color-ink-50)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fixture scoreboard strip */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Crest name={fixture.homeTeam.name} logoUrl={fixture.homeTeam.logoUrl} />
              <span className="font-display text-base tracking-wide text-[color:var(--color-ink-100)] truncate">
                {fixture.homeTeam.name}
              </span>
            </div>
            <div className="flex flex-col items-center px-2">
              {showActualScore ? (
                <>
                  <span className="font-mono text-[0.5rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)]">
                    Final
                  </span>
                  <span className="scoreboard text-3xl text-[color:var(--color-ink-50)] tabular-nums leading-none mt-0.5">
                    {fixture.homeScore}
                    <span className="text-[color:var(--color-ink-500)] mx-1.5">
                      –
                    </span>
                    {fixture.awayScore}
                  </span>
                </>
              ) : (
                <span className="chip chip-volt">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 justify-end flex-row-reverse min-w-0">
              <Crest name={fixture.awayTeam.name} logoUrl={fixture.awayTeam.logoUrl} />
              <span className="font-display text-base tracking-wide text-[color:var(--color-ink-100)] truncate">
                {fixture.awayTeam.name}
              </span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 rounded-xl skeleton" />
              <div className="h-24 rounded-xl skeleton" />
              <div className="h-24 rounded-xl skeleton" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[color:var(--color-loss-500)]/8 border border-[color:var(--color-loss-500)]/40 text-[color:var(--color-loss-500)] text-sm flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="text-[color:var(--color-ink-100)]">{error}</span>
            </div>
          ) : data && !data.locked ? (
            // Defensive: card shouldn't open this before lock, but guard anyway.
            <div className="rounded-xl border border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/40 p-8 text-center">
              <Lock className="w-7 h-7 text-[color:var(--color-ink-500)] mx-auto mb-3" />
              <p className="font-display text-2xl tracking-wide text-[color:var(--color-ink-100)]">
                Picks are sealed
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-ink-300)]">
                Everyone&rsquo;s predictions unlock the moment this match locks.
              </p>
              {data.lockedAt && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60">
                  <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)]">
                    Unlocks
                  </span>
                  <LockCountdown locksAt={data.lockedAt} />
                </div>
              )}
              <p className="mt-4 font-mono text-[0.6rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-400)]">
                {data.predictionCount} / {data.memberCount} already in
              </p>
            </div>
          ) : data && data.predictions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/40 p-10 text-center">
              <Users className="w-7 h-7 text-[color:var(--color-ink-500)] mx-auto mb-3" />
              <p className="font-display text-2xl tracking-wide text-[color:var(--color-ink-100)]">
                Nobody called this one
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-ink-300)]">
                No members in this league predicted this match.
              </p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Consensus */}
              <section className="rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/40 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-volt-200)]">
                    / How the room split
                  </span>
                  <span className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] tabular-nums">
                    {data.predictionCount}/{data.memberCount} predicted
                  </span>
                </div>
                <ConsensusMeter fixture={fixture} predictions={data.predictions} />
              </section>

              {/* Slips */}
              <section>
                <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-volt-200)] mb-3">
                  / {data.predictions.length}{' '}
                  {data.predictions.length === 1 ? 'pick' : 'picks'}
                </p>
                <div className="space-y-3">
                  {data.predictions.map((p, i) => (
                    <PredictionSlip
                      key={p.userId}
                      prediction={p}
                      fixture={fixture}
                      isFinal={isFinal}
                      isLeader={leaderUserId === p.userId}
                      index={i}
                    />
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
