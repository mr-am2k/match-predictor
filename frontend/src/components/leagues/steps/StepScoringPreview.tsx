import { Info } from 'lucide-react';

const rules = [
  { points: 1, description: 'Correct winner or draw' },
  { points: 2, description: 'Exact score (in addition to the winner point)' },
  { points: 3, description: 'Each correct goalscorer (up to 3 per match)' },
  { points: 3, description: 'Each correct assister (up to 3 per match)' },
];

export function StepScoringPreview() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="font-mono text-[0.68rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
          / Step 04 — Scoring readout
        </p>
        <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)]">
          How points drop.
        </h2>
        <p className="mt-3 text-[color:var(--color-ink-200)] max-w-xl">
          The default ruleset used across every league on the platform.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-[color:var(--color-draw-500)]/30 bg-[color:var(--color-draw-500)]/5 text-[color:var(--color-draw-500)]">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[color:var(--color-ink-100)]">
          The scoring system is fixed for now. We may let league owners customize it in a future update.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[0.62rem] tracking-[0.28em] uppercase text-[color:var(--color-volt-200)]">
            / Match predictions
          </span>
          <span className="h-[1px] flex-1 bg-[color:var(--color-ink-700)]" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {rules.map((rule) => (
            <div
              key={rule.description}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60"
            >
              <span className="text-sm text-[color:var(--color-ink-100)]">{rule.description}</span>
              <div className="inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg border border-[color:var(--color-volt-200)]/30 bg-[color:var(--color-volt-200)]/5 flex-shrink-0">
                <span className="scoreboard text-lg text-[color:var(--color-volt-200)] tabular-nums">
                  {rule.points}
                </span>
                <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-[color:var(--color-volt-200)]/80">
                  {rule.points === 1 ? 'pt' : 'pts'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
