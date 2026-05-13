import type { LeagueScoringRules } from '../../../types/scoring';
import { ScoringRulesTable } from '../ScoringRulesTable';

interface StepScoringProps {
  scoringRules: LeagueScoringRules;
  onChange: (next: LeagueScoringRules) => void;
  errors?: Partial<Record<keyof LeagueScoringRules, string>>;
}

export function StepScoring({ scoringRules, onChange, errors }: StepScoringProps) {
  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="font-mono text-[0.68rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
          / Step 04 — The scoring dial
        </p>
        <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)]">
          Tune the scoring.
        </h2>
        <p className="mt-3 text-[color:var(--color-ink-200)] max-w-xl">
          Decide what wins this league — exact scores, scorer hunches, or bravery multipliers. Changes lock the moment the first prediction lands.
        </p>
      </div>

      <ScoringRulesTable value={scoringRules} onChange={onChange} errors={errors} />
    </div>
  );
}
