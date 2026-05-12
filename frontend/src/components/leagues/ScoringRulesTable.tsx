import { RotateCcw } from 'lucide-react';
import type { LeagueScoringRules } from '../../types/scoring';
import { DEFAULT_SCORING_RULES } from '../../types/scoring';

interface ScoringRulesTableProps {
  value: LeagueScoringRules;
  onChange: (next: LeagueScoringRules) => void;
  readOnly?: boolean;
  errors?: Partial<Record<keyof LeagueScoringRules, string>>;
}

type Field = keyof LeagueScoringRules;

interface Row {
  field: Field;
  label: string;
  description: string;
  min: number;
  max: number;
  isDecimal: boolean;
}

interface Section {
  title: string;
  subtitle: string;
  rows: Row[];
}

const SECTIONS: Section[] = [
  {
    title: 'Per match',
    subtitle: 'Points awarded for each fixture prediction.',
    rows: [
      {
        field: 'matchWinnerPoints',
        label: 'Correct winner / draw',
        description: 'Awarded when the predicted outcome matches.',
        min: 0,
        max: 50,
        isDecimal: false,
      },
      {
        field: 'matchExactScorePoints',
        label: 'Exact score',
        description: 'Bonus on top of the winner point for nailing the scoreline.',
        min: 0,
        max: 50,
        isDecimal: false,
      },
      {
        field: 'matchScorerPoints',
        label: 'Each correct scorer',
        description: 'Per goalscorer you correctly predicted (up to 3 per match).',
        min: 0,
        max: 50,
        isDecimal: false,
      },
      {
        field: 'matchAssisterPoints',
        label: 'Each correct assister',
        description: 'Per assister you correctly predicted (up to 3 per match).',
        min: 0,
        max: 50,
        isDecimal: false,
      },
    ],
  },
  {
    title: 'League-wide',
    subtitle: 'Season-long predictions resolved once the competition ends.',
    rows: [
      {
        field: 'leagueWinnerPoints',
        label: 'Competition winner',
        description: 'For correctly picking the team that wins the competition.',
        min: 0,
        max: 100,
        isDecimal: false,
      },
      {
        field: 'leagueTopScorerPoints',
        label: 'Top scorer',
        description: 'For correctly picking the season top scorer.',
        min: 0,
        max: 100,
        isDecimal: false,
      },
      {
        field: 'leagueTopAssisterPoints',
        label: 'Top assister',
        description: 'For correctly picking the season top assister.',
        min: 0,
        max: 100,
        isDecimal: false,
      },
    ],
  },
  {
    title: 'Per-match multipliers',
    subtitle: 'Multiplies your per-match points when more categories land.',
    rows: [
      {
        field: 'matchBonus2x',
        label: '2 categories correct',
        description: 'Applied when any two categories (winner/exact/scorer/assister) hit.',
        min: 1,
        max: 10,
        isDecimal: true,
      },
      {
        field: 'matchBonus3x',
        label: '3 categories correct',
        description: 'Applied when three categories hit on the same match.',
        min: 1,
        max: 10,
        isDecimal: true,
      },
      {
        field: 'matchBonus4x',
        label: '4 categories correct',
        description: 'Applied when all four categories hit on the same match.',
        min: 1,
        max: 10,
        isDecimal: true,
      },
    ],
  },
  {
    title: 'League-wide multipliers',
    subtitle: 'Multiplies your league-wide points when multiple picks land.',
    rows: [
      {
        field: 'leagueBonus2of3',
        label: '2 of 3 correct',
        description: 'Applied when two of the three season-long predictions hit.',
        min: 1,
        max: 10,
        isDecimal: true,
      },
      {
        field: 'leagueBonus3of3',
        label: '3 of 3 correct',
        description: 'Applied when all three season-long predictions hit.',
        min: 1,
        max: 10,
        isDecimal: true,
      },
    ],
  },
];

function formatValue(n: number, isDecimal: boolean): string {
  if (isDecimal) {
    return Number.isInteger(n) ? n.toFixed(2) : n.toString();
  }
  return n.toString();
}

export function ScoringRulesTable({
  value,
  onChange,
  readOnly = false,
  errors,
}: ScoringRulesTableProps) {
  const handleFieldChange = (field: Field, raw: string, isDecimal: boolean) => {
    if (raw === '') {
      onChange({ ...value, [field]: 0 });
      return;
    }
    const parsed = isDecimal ? parseFloat(raw) : parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    onChange({ ...value, [field]: parsed });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_SCORING_RULES });
  };

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to defaults
          </button>
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{section.subtitle}</p>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200">
            {section.rows.map((row) => {
              const fieldValue = value[row.field];
              const error = errors?.[row.field];
              return (
                <div
                  key={row.field}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{row.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {row.description}
                    </div>
                    {error && (
                      <div className="text-xs text-red-600 mt-1">{error}</div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {readOnly ? (
                      <span className="font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg text-sm whitespace-nowrap">
                        {row.isDecimal
                          ? `${formatValue(fieldValue, true)}x`
                          : `${fieldValue} ${fieldValue === 1 ? 'pt' : 'pts'}`}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={row.min}
                          max={row.max}
                          step={row.isDecimal ? '0.01' : '1'}
                          value={fieldValue}
                          onChange={(e) =>
                            handleFieldChange(
                              row.field,
                              e.target.value,
                              row.isDecimal
                            )
                          }
                          className={`w-24 rounded-lg border px-3 py-2 text-right text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                            error
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                          }`}
                        />
                        <span className="text-xs text-gray-500 w-8">
                          {row.isDecimal ? 'x' : fieldValue === 1 ? 'pt' : 'pts'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
