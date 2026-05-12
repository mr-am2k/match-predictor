import { Check } from 'lucide-react';
import type { PlayerSummary } from '../../types/prediction';

interface PlayerMultiSelectProps {
  players: PlayerSummary[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  max: number;
  disabled?: boolean;
  emptyMessage?: string;
}

export function PlayerMultiSelect({
  players,
  selectedIds,
  onChange,
  max,
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

  const selectedSet = new Set(selectedIds);
  const atCapacity = selectedIds.length >= max;

  const toggle = (playerId: number) => {
    if (disabled) return;
    if (selectedSet.has(playerId)) {
      onChange(selectedIds.filter((id) => id !== playerId));
      return;
    }
    if (atCapacity) {
      return;
    }
    onChange([...selectedIds, playerId]);
  };

  return (
    <div
      className={`flex flex-col gap-1 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-1 bg-white ${disabled ? 'opacity-60' : ''}`}
    >
      {players.map((player) => {
        const selected = selectedSet.has(player.playerId);
        const rowDisabled = disabled || (!selected && atCapacity);
        const title = rowDisabled && !disabled ? `Maximum ${max} selected` : undefined;

        return (
          <button
            key={player.playerId}
            type="button"
            onClick={() => toggle(player.playerId)}
            disabled={rowDisabled}
            title={title}
            className={`
              flex items-center gap-3 w-full px-2.5 py-1.5 rounded-md text-left
              transition-colors
              ${
                selected
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-white border border-transparent hover:bg-gray-50'
              }
              ${rowDisabled && !selected ? 'opacity-50 cursor-not-allowed' : ''}
              disabled:cursor-not-allowed
            `}
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
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                selected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
