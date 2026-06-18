export interface LeagueScoringRules {
  matchWinnerPoints: number;
  matchExactScorePoints: number;
  matchScorerPoints: number;
  matchAssisterPoints: number;
  leagueWinnerPoints: number;
  leagueTopScorerPoints: number;
  leagueTopAssisterPoints: number;
  matchBonus2x: number;
  matchBonus3x: number;
  matchBonus4x: number;
  leagueBonus2of3: number;
  leagueBonus3of3: number;
  // Per-match assister toggle (V13). When false, assisters are hidden from the
  // prediction UI and excluded from scoring going forward.
  assistersEnabled: boolean;
}

export interface LeagueScoringRulesResponse extends LeagueScoringRules {
  editable: boolean;
}

export const DEFAULT_SCORING_RULES: LeagueScoringRules = {
  matchWinnerPoints: 1,
  matchExactScorePoints: 2,
  matchScorerPoints: 3,
  matchAssisterPoints: 3,
  leagueWinnerPoints: 10,
  leagueTopScorerPoints: 5,
  leagueTopAssisterPoints: 5,
  matchBonus2x: 1.5,
  matchBonus3x: 2,
  matchBonus4x: 3,
  leagueBonus2of3: 1.5,
  leagueBonus3of3: 3,
  assistersEnabled: true,
};

export const SCORING_LOCKED_MESSAGE =
  'Scoring rules are locked once predictions are submitted.';

type FieldErrors = Partial<Record<keyof LeagueScoringRules, string>>;

interface FieldSpec {
  field: keyof LeagueScoringRules;
  min: number;
  max: number;
  isDecimal: boolean;
  label: string;
}

const SCORING_FIELD_SPECS: FieldSpec[] = [
  { field: 'matchWinnerPoints', min: 0, max: 50, isDecimal: false, label: 'Match winner points' },
  { field: 'matchExactScorePoints', min: 0, max: 50, isDecimal: false, label: 'Match exact score points' },
  { field: 'matchScorerPoints', min: 0, max: 50, isDecimal: false, label: 'Match scorer points' },
  { field: 'matchAssisterPoints', min: 0, max: 50, isDecimal: false, label: 'Match assister points' },
  { field: 'leagueWinnerPoints', min: 0, max: 100, isDecimal: false, label: 'League winner points' },
  { field: 'leagueTopScorerPoints', min: 0, max: 100, isDecimal: false, label: 'Top scorer points' },
  { field: 'leagueTopAssisterPoints', min: 0, max: 100, isDecimal: false, label: 'Top assister points' },
  { field: 'matchBonus2x', min: 1, max: 10, isDecimal: true, label: '2-category multiplier' },
  { field: 'matchBonus3x', min: 1, max: 10, isDecimal: true, label: '3-category multiplier' },
  { field: 'matchBonus4x', min: 1, max: 10, isDecimal: true, label: '4-category multiplier' },
  { field: 'leagueBonus2of3', min: 1, max: 10, isDecimal: true, label: '2-of-3 multiplier' },
  { field: 'leagueBonus3of3', min: 1, max: 10, isDecimal: true, label: '3-of-3 multiplier' },
];

export function validateScoringRules(rules: LeagueScoringRules): FieldErrors {
  const errors: FieldErrors = {};
  for (const spec of SCORING_FIELD_SPECS) {
    const value = rules[spec.field];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors[spec.field] = 'Enter a valid number';
      continue;
    }
    if (value < spec.min || value > spec.max) {
      errors[spec.field] = spec.isDecimal
        ? `Must be between ${spec.min.toFixed(2)} and ${spec.max.toFixed(2)}`
        : `Must be between ${spec.min} and ${spec.max}`;
    }
  }
  return errors;
}

export function hasScoringErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
