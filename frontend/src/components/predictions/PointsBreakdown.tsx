import { Check, Minus, Target, X, Zap } from 'lucide-react';
import type { ScoreBreakdown, ScoreLine } from '../../types/prediction';

/**
 * The settled-prediction points ledger: shows exactly where points came from
 * (winner, exact score, each scorer/assister with predicted-vs-actual) and the
 * bonus multiplier applied. Used on the user's own match card and in the reveal.
 */

// Trim a multiplier like 2.0 -> "2", 1.5 -> "1.5".
function fmtMultiplier(m: number): string {
  return Number.isInteger(m) ? String(m) : String(Math.round(m * 100) / 100);
}

function PointsTag({ points, hit }: { points: number; hit: boolean }) {
  if (hit && points > 0) {
    return (
      <span className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded border border-[color:var(--color-win-500)]/40 bg-[color:var(--color-win-500)]/10 text-[color:var(--color-win-500)]">
        +{points}
      </span>
    );
  }
  return (
    <span className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60 text-[color:var(--color-ink-400)]">
      0
    </span>
  );
}

function CategoryRow({
  label,
  hit,
  points,
}: {
  label: string;
  hit: boolean;
  points: number;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          hit
            ? 'bg-[color:var(--color-win-500)]/15 text-[color:var(--color-win-500)]'
            : 'bg-[color:var(--color-ink-800)] text-[color:var(--color-ink-500)]'
        }`}
      >
        {hit ? <Check className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
      </span>
      <span className="font-mono text-[0.62rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-200)] flex-1">
        {label}
      </span>
      <PointsTag points={points} hit={hit} />
    </div>
  );
}

function PlayerRow({ line, kind }: { line: ScoreLine; kind: 'goal' | 'assist' }) {
  const unit = kind === 'goal' ? 'G' : 'A';
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          line.correct
            ? 'bg-[color:var(--color-win-500)]/15 text-[color:var(--color-win-500)]'
            : 'bg-[color:var(--color-loss-500)]/12 text-[color:var(--color-loss-500)]'
        }`}
      >
        {line.correct ? (
          <Check className="w-2.5 h-2.5" />
        ) : (
          <X className="w-2.5 h-2.5" />
        )}
      </span>
      <span className="text-[0.78rem] text-[color:var(--color-ink-100)] truncate flex-1 min-w-0">
        {line.name}
      </span>
      <span className="font-mono text-[0.58rem] tracking-[0.1em] tabular-nums text-[color:var(--color-ink-400)] flex-shrink-0">
        pick {line.predicted}
        {unit}
        <span className="text-[color:var(--color-ink-600)] mx-1">·</span>
        got {line.actual}
        {unit}
      </span>
      <PointsTag points={line.points} hit={line.correct} />
    </div>
  );
}

export function PointsBreakdown({
  breakdown,
}: {
  breakdown: ScoreBreakdown;
}) {
  const hasBonus = breakdown.multiplier > 1;
  const winnerHit = breakdown.winnerPoints > 0;
  const exactHit = breakdown.scorePoints > 0;

  return (
    <div className="rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/50 overflow-hidden">
      {/* Total header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[color:var(--color-volt-200)]" />
          <span className="font-mono text-[0.6rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-200)]">
            Points breakdown
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className={`scoreboard text-2xl leading-none ${
              breakdown.total > 0
                ? 'text-[color:var(--color-win-500)]'
                : 'text-[color:var(--color-ink-400)]'
            }`}
          >
            {breakdown.total > 0 ? `+${breakdown.total}` : breakdown.total}
          </span>
          <span className="font-mono text-[0.5rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)]">
            pts
          </span>
        </div>
      </div>

      {/* Ledger */}
      <div className="px-4 py-1 divide-y divide-[color:var(--color-ink-800)]">
        <CategoryRow label="Winner" hit={winnerHit} points={breakdown.winnerPoints} />
        <CategoryRow label="Exact score" hit={exactHit} points={breakdown.scorePoints} />
        {breakdown.scorers.map((line) => (
          <PlayerRow key={`s-${line.playerId}`} line={line} kind="goal" />
        ))}
        {breakdown.assisters.map((line) => (
          <PlayerRow key={`a-${line.playerId}`} line={line} kind="assist" />
        ))}
      </div>

      {/* Multiplier footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/40">
        <span className="font-mono text-[0.58rem] tracking-[0.12em] uppercase text-[color:var(--color-ink-400)] tabular-nums">
          Base {breakdown.baseTotal}
          <span className="text-[color:var(--color-ink-600)] mx-1.5">×</span>
          {fmtMultiplier(breakdown.multiplier)}
          <span className="text-[color:var(--color-ink-600)] mx-1.5">=</span>
          <span className="text-[color:var(--color-ink-100)]">{breakdown.total}</span>
        </span>
        {hasBonus ? (
          <span className="chip chip-volt">
            <Zap className="w-3 h-3" />×{fmtMultiplier(breakdown.multiplier)} bonus ·{' '}
            {breakdown.categoriesHit} of 4
          </span>
        ) : (
          <span className="font-mono text-[0.55rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-500)]">
            {breakdown.categoriesHit} of 4 hit
          </span>
        )}
      </div>
    </div>
  );
}
