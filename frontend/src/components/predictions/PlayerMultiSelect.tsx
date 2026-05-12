import { Check, Minus, Plus } from 'lucide-react';
import type { PlayerPick, PlayerSummary } from '../../types/prediction';

interface PlayerMultiSelectProps {
  players: PlayerSummary[];
  picks: PlayerPick[];
  onChange: (next: PlayerPick[]) => void;
  maxCount: number;
  disabled?: boolean;
  emptyMessage?: string;
}

function sumCounts(picks: PlayerPick[]): number {
  return picks.reduce((acc, pick) => acc + pick.count, 0);
}

export function PlayerMultiSelect({
  players,
  picks,
  onChange,
  maxCount,
  disabled = false,
  emptyMessage = 'No players available.',
}: PlayerMultiSelectProps) {
  if (players.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        {emptyMessage}
      </div>
    );
  }

  const pickByPlayerId = new Map(picks.map((pick) => [pick.playerId, pick]));
  const totalCount = sumCounts(picks);
  const atCapacity = totalCount >= maxCount;

  const toggle = (playerId: number) => {
    if (disabled) return;
    if (pickByPlayerId.has(playerId)) {
      onChange(picks.filter((pick) => pick.playerId !== playerId));
      return;
    }
    if (atCapacity) {
      return;
    }
    onChange([...picks, { playerId, count: 1 }]);
  };

  const increment = (playerId: number) => {
    if (disabled || atCapacity) return;
    onChange(
      picks.map((pick) =>
        pick.playerId === playerId ? { ...pick, count: pick.count + 1 } : pick
      )
    );
  };

  const decrement = (playerId: number) => {
    if (disabled) return;
    const current = pickByPlayerId.get(playerId);
    if (!current) return;
    if (current.count <= 1) {
      onChange(picks.filter((pick) => pick.playerId !== playerId));
      return;
    }
    onChange(
      picks.map((pick) =>
        pick.playerId === playerId ? { ...pick, count: pick.count - 1 } : pick
      )
    );
  };

  return (
    <div
      className={`flex flex-col gap-1 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-1 bg-white ${disabled ? 'opacity-60' : ''}`}
    >
      {players.map((player) => {
        const pick = pickByPlayerId.get(player.playerId);
        const selected = pick !== undefined;
        const rowDisabled = disabled || (!selected && atCapacity);
        const title =
          rowDisabled && !disabled ? `Maximum ${maxCount} goals` : undefined;
        const incrementDisabled = disabled || atCapacity;

        return (
          <div
            key={player.playerId}
            className={`
              flex items-center gap-3 w-full px-2.5 py-1.5 rounded-md text-left
              transition-colors
              ${
                selected
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-white border border-transparent hover:bg-gray-50'
              }
              ${rowDisabled && !selected ? 'opacity-50' : ''}
            `}
          >
            <button
              type="button"
              onClick={() => toggle(player.playerId)}
              disabled={rowDisabled}
              title={title}
              className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {player.photoUrl ? (
                  <img
                    src={player.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-gray-500">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {player.name}
                </div>
                {player.position && (
                  <div className="text-[10px] uppercase tracking-wide text-gray-500">
                    {player.position}
                  </div>
                )}
              </div>
            </button>
            {selected ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => decrement(player.playerId)}
                  disabled={disabled}
                  aria-label="Decrease count"
                  className="w-6 h-6 rounded-md border border-indigo-200 bg-white text-indigo-600 flex items-center justify-center hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  className="min-w-[1.25rem] text-center text-sm font-semibold text-indigo-700 tabular-nums"
                  aria-label={`Count ${pick!.count}`}
                >
                  {pick!.count}
                </span>
                <button
                  type="button"
                  onClick={() => increment(player.playerId)}
                  disabled={incrementDisabled}
                  aria-label="Increase count"
                  title={
                    !disabled && atCapacity ? `Maximum ${maxCount} goals` : undefined
                  }
                  className="w-6 h-6 rounded-md border border-indigo-200 bg-white text-indigo-600 flex items-center justify-center hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
