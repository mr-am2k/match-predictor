import { CheckCircle2, Lock, Radio } from 'lucide-react';
import type { GameweekStatus, GameweekSummary } from '../../types/prediction';

interface GameweekPickerProps {
  gameweeks: GameweekSummary[];
  selectedRound: string | null;
  onSelect: (round: string) => void;
}

function shortenRound(round: string): {
  label: string;
  number: string | null;
} {
  // Strip a "Regular Season - 12" prefix → { label: "GW", number: "12" }.
  const regularMatch = round.match(/^Regular Season - (.+)$/i);
  if (regularMatch) {
    return { label: 'GW', number: regularMatch[1] };
  }
  return { label: round, number: null };
}

function statusMeta(status: GameweekStatus, isSelected: boolean) {
  switch (status) {
    case 'OPEN':
      return {
        Icon: Radio,
        label: 'Open',
        tone: isSelected
          ? 'text-[color:var(--color-ink-950)]'
          : 'text-[color:var(--color-win-500)]',
      };
    case 'LOCKED':
      return {
        Icon: Lock,
        label: 'Locked',
        tone: isSelected
          ? 'text-[color:var(--color-ink-950)]'
          : 'text-[color:var(--color-draw-500)]',
      };
    case 'SETTLED':
      return {
        Icon: CheckCircle2,
        label: 'Settled',
        tone: isSelected
          ? 'text-[color:var(--color-ink-950)]'
          : 'text-[color:var(--color-ink-300)]',
      };
  }
}

export function GameweekPicker({
  gameweeks,
  selectedRound,
  onSelect,
}: GameweekPickerProps) {
  if (gameweeks.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[color:var(--color-ink-900)] to-transparent z-10"
      />
      <div
        className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
        role="tablist"
        aria-label="Gameweeks"
      >
        {gameweeks.map((gw) => {
          const isSelected = gw.round === selectedRound;
          const { label, number } = shortenRound(gw.round);
          const { Icon, label: statusLabel, tone } = statusMeta(gw.status, isSelected);
          const allPicked =
            gw.fixtureCount > 0 && gw.userPredictionCount === gw.fixtureCount;

          return (
            <button
              key={gw.round}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelect(gw.round)}
              className={`
                group relative flex-shrink-0 snap-start
                flex flex-col items-start gap-2 px-4 py-3 min-w-[7.5rem]
                rounded-xl border
                transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out
                ${
                  isSelected
                    ? 'bg-[color:var(--color-volt-200)] border-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] shadow-[0_0_0_1px_rgba(215,255,61,0.35),0_10px_28px_-12px_rgba(215,255,61,0.55)]'
                    : 'bg-[color:var(--color-ink-850)]/80 border-[color:var(--color-ink-700)] text-[color:var(--color-ink-100)] hover:border-[color:var(--color-ink-500)] hover:bg-[color:var(--color-ink-800)]'
                }
              `}
            >
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`
                    font-mono text-[0.6rem] tracking-[0.25em] uppercase
                    ${
                      isSelected
                        ? 'text-[color:var(--color-ink-950)]/70'
                        : 'text-[color:var(--color-ink-300)]'
                    }
                  `}
                >
                  {label}
                </span>
                {number && (
                  <span
                    className={`
                      font-display text-2xl leading-none tracking-wide tabular-nums
                      ${isSelected ? 'text-[color:var(--color-ink-950)]' : 'text-[color:var(--color-ink-50)]'}
                    `}
                  >
                    {number}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full">
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[0.58rem] tracking-[0.2em] uppercase ${tone}`}
                >
                  <Icon className="w-3 h-3" strokeWidth={2.25} />
                  {statusLabel}
                </span>
                <span
                  className={`
                    ml-auto font-mono text-[0.65rem] tabular-nums
                    ${
                      isSelected
                        ? 'text-[color:var(--color-ink-950)]/80'
                        : allPicked
                          ? 'text-[color:var(--color-volt-200)]'
                          : 'text-[color:var(--color-ink-300)]'
                    }
                  `}
                >
                  {gw.userPredictionCount}/{gw.fixtureCount}
                </span>
              </div>

              {/* underline accent for non-selected current GW marker */}
              {!isSelected && allPicked && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-4 right-4 h-[2px] bg-[color:var(--color-volt-200)]/60"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
