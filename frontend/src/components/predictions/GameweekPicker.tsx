import { CheckCircle, Lock } from 'lucide-react';
import type { GameweekStatus, GameweekSummary } from '../../types/prediction';

interface GameweekPickerProps {
  gameweeks: GameweekSummary[];
  selectedRound: string | null;
  onSelect: (round: string) => void;
}

function shortenRound(round: string): string {
  // Strip a "Regular Season - " prefix and prepend "GW "
  const regularMatch = round.match(/^Regular Season - (.+)$/i);
  if (regularMatch) {
    return `GW ${regularMatch[1]}`;
  }
  return round;
}

function statusBadgeClasses(status: GameweekStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-green-100 text-green-700';
    case 'LOCKED':
      return 'bg-amber-100 text-amber-700';
    case 'SETTLED':
      return 'bg-gray-200 text-gray-700';
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
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {gameweeks.map((gw) => {
        const isSelected = gw.round === selectedRound;
        const Icon =
          gw.status === 'LOCKED'
            ? Lock
            : gw.status === 'SETTLED'
              ? CheckCircle
              : null;

        return (
          <button
            key={gw.round}
            type="button"
            onClick={() => onSelect(gw.round)}
            className={`
              flex-shrink-0 flex flex-col items-start gap-1 px-4 py-2.5 rounded-lg border
              transition-colors
              ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-center gap-1.5">
              {Icon && (
                <Icon
                  className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-500'}`}
                />
              )}
              <span className="font-semibold text-sm whitespace-nowrap">
                {shortenRound(gw.round)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`
                  text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded
                  ${isSelected ? 'bg-indigo-500 text-white' : statusBadgeClasses(gw.status)}
                `}
              >
                {gw.status}
              </span>
              <span
                className={`text-xs ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}
              >
                {gw.userPredictionCount}/{gw.fixtureCount}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
