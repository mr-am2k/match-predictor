import { RotateCcw } from 'lucide-react';
import type { LeagueScoringRules } from '../../types/scoring';
import { DEFAULT_SCORING_RULES } from '../../types/scoring';

interface ScoringRulesTableProps {
  value: LeagueScoringRules;
  onChange: (next: LeagueScoringRules) => void;
  readOnly?: boolean;
  errors?: Partial<Record<keyof LeagueScoringRules, string>>;
}

// Numeric rule fields only — excludes the boolean `assistersEnabled`, which is
// rendered via the dedicated toggle rather than the numeric input rows.
type Field = {
  [K in keyof LeagueScoringRules]: LeagueScoringRules[K] extends number
    ? K
    : never;
}[keyof LeagueScoringRules];

interface Row {
  field: Field;
  label: string;
  description: string;
  min: number;
  max: number;
  isDecimal: boolean;
}

interface Section {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: Row[];
}

const SECTIONS: Section[] = [
  {
    id: 'per-match',
    eyebrow: '/ 01',
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
        description: 'Points awarded per goal when your scorer pick matches the exact tally (e.g. 3 pts x 2 goals = 6).',
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
    id: 'league-wide',
    eyebrow: '/ 02',
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
    id: 'match-multipliers',
    eyebrow: '/ 03',
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
    id: 'league-multipliers',
    eyebrow: '/ 04',
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
    <div className="space-y-8">
      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to defaults
          </button>
        </div>
      )}

      <div className="rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-base tracking-wide uppercase text-[color:var(--color-ink-50)]">
              Per-match assisters
            </p>
            <p className="text-xs text-[color:var(--color-ink-300)] leading-relaxed mt-1">
              Let members predict assisters and earn points for them. Turning this off hides assisters
              from new predictions and removes them from scoring — fixtures that already settled keep
              their points. You can turn it back on at any time.
            </p>
          </div>
          {readOnly ? (
            <div className="flex-shrink-0 text-right">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-lg border font-mono text-[0.6rem] tracking-[0.2em] uppercase ${
                  value.assistersEnabled
                    ? 'border-[color:var(--color-volt-200)]/30 bg-[color:var(--color-volt-200)]/5 text-[color:var(--color-volt-200)]'
                    : 'border-[color:var(--color-ink-600)] bg-[color:var(--color-ink-800)] text-[color:var(--color-ink-400)]'
                }`}
              >
                {value.assistersEnabled ? 'On' : 'Off'}
              </span>
            </div>
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={value.assistersEnabled}
              aria-label="Toggle per-match assisters"
              onClick={() =>
                onChange({ ...value, assistersEnabled: !value.assistersEnabled })
              }
              className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                value.assistersEnabled
                  ? 'bg-[color:var(--color-volt-200)]/80 border-[color:var(--color-volt-200)]'
                  : 'bg-[color:var(--color-ink-800)] border-[color:var(--color-ink-600)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[color:var(--color-ink-950)] transition-transform ${
                  value.assistersEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.id} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[0.62rem] tracking-[0.28em] uppercase text-[color:var(--color-volt-200)]">
              {section.eyebrow}
            </span>
            <span className="h-[1px] flex-1 bg-[color:var(--color-ink-700)]" />
          </div>
          <div>
            <h3 className="font-display text-2xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
              {section.title}
            </h3>
            <p className="text-sm text-[color:var(--color-ink-200)] mt-1">{section.subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {section.rows.map((row) => {
              const fieldValue = value[row.field];
              const error = errors?.[row.field];
              const hasError = Boolean(error);
              return (
                <div
                  key={row.field}
                  className={`group relative rounded-xl border p-4 transition-colors ${
                    hasError
                      ? 'border-[color:var(--color-loss-500)]/50 bg-[color:var(--color-loss-500)]/5'
                      : 'border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60 hover:border-[color:var(--color-ink-600)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base tracking-wide uppercase text-[color:var(--color-ink-50)]">
                        {row.label}
                      </p>
                      <p className="text-xs text-[color:var(--color-ink-300)] leading-relaxed mt-1">
                        {row.description}
                      </p>
                    </div>
                    {readOnly ? (
                      <div className="flex-shrink-0 text-right">
                        <div className="inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg border border-[color:var(--color-volt-200)]/30 bg-[color:var(--color-volt-200)]/5">
                          <span className="scoreboard text-xl text-[color:var(--color-volt-200)] tabular-nums">
                            {row.isDecimal ? formatValue(fieldValue, true) : fieldValue}
                          </span>
                          <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-[color:var(--color-volt-200)]/80">
                            {row.isDecimal ? 'x' : fieldValue === 1 ? 'pt' : 'pts'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-shrink-0 inline-flex items-center gap-2">
                        <input
                          type="number"
                          min={row.min}
                          max={row.max}
                          step={row.isDecimal ? '0.01' : '1'}
                          value={fieldValue}
                          onChange={(e) =>
                            handleFieldChange(row.field, e.target.value, row.isDecimal)
                          }
                          className={`w-20 rounded-lg border px-2.5 py-1.5 text-right font-mono tabular-nums text-sm text-[color:var(--color-ink-50)] bg-[color:var(--color-ink-800)] outline-none transition-colors ${
                            hasError
                              ? 'border-[color:var(--color-loss-500)]/60 focus:border-[color:var(--color-loss-500)]'
                              : 'border-[color:var(--color-ink-700)] focus:border-[color:var(--color-volt-200)]/70'
                          }`}
                        />
                        <span className="font-mono text-[0.6rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] w-6">
                          {row.isDecimal ? 'x' : fieldValue === 1 ? 'pt' : 'pts'}
                        </span>
                      </div>
                    )}
                  </div>
                  {error && (
                    <p className="mt-2 text-xs text-[color:var(--color-loss-500)] flex items-center gap-1.5">
                      <span className="inline-block w-1 h-1 rounded-full bg-[color:var(--color-loss-500)]" />
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
