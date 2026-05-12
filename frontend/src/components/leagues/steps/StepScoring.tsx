import type { LeagueScoringRules } from '../../../types/scoring';
import { ScoringRulesTable } from '../ScoringRulesTable';

interface StepScoringProps {
  scoringRules: LeagueScoringRules;
  onChange: (next: LeagueScoringRules) => void;
  errors?: Partial<Record<keyof LeagueScoringRules, string>>;
}

export function StepScoring({ scoringRules, onChange, errors }: StepScoringProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Scoring system</h2>
        <p className="text-gray-600 mt-1">
          Tune how points are awarded in your league. You can change these later until
          predictions are submitted.
        </p>
      </div>

      <ScoringRulesTable value={scoringRules} onChange={onChange} errors={errors} />
    </div>
  );
}
