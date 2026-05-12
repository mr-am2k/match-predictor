import { Check, Minus, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
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

// Deterministic avatar hue derived from the player's id — keeps UI lively
// without needing a colour palette.
function avatarTone(playerId: number): string {
  const tones = [
    'from-[color:var(--color-ink-750)] to-[color:var(--color-ink-800)] text-[color:var(--color-volt-200)]',
    'from-[color:var(--color-ink-800)] to-[color:var(--color-ink-850)] text-[color:var(--color-win-500)]',
    'from-[color:var(--color-ink-750)] to-[color:var(--color-ink-850)] text-[color:var(--color-draw-500)]',
    'from-[color:var(--color-ink-800)] to-[color:var(--color-ink-900)] text-[color:var(--color-ink-50)]',
    'from-[color:var(--color-ink-850)] to-[color:var(--color-ink-800)] text-[color:var(--color-volt-100)]',
  ];
  return tones[Math.abs(playerId) % tones.length];
}

function positionTone(position: string | null): string {
  if (!position) return 'text-[color:var(--color-ink-400)]';
  const p = position.toUpperCase();
  if (p.startsWith('G')) return 'text-[color:var(--color-draw-500)]';
  if (p.startsWith('D')) return 'text-[color:var(--color-ink-200)]';
  if (p.startsWith('M')) return 'text-[color:var(--color-volt-200)]';
  if (p.startsWith('F') || p.startsWith('A') || p.startsWith('S') || p.startsWith('W'))
    return 'text-[color:var(--color-win-500)]';
  return 'text-[color:var(--color-ink-300)]';
}

function PlayerAvatar({ player }: { player: PlayerSummary }) {
  return (
    <div
      className={`w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden border border-[color:var(--color-ink-700)] bg-gradient-to-br ${avatarTone(player.playerId)} flex items-center justify-center`}
      aria-hidden
    >
      {player.photoUrl ? (
        <img
          src={player.photoUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-display text-sm leading-none tracking-wide">
          {player.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function PlayerMultiSelect({
  players,
  picks,
  onChange,
  maxCount,
  disabled = false,
  emptyMessage = 'No players available.',
}: PlayerMultiSelectProps) {
  const [query, setQuery] = useState('');

  const pickByPlayerId = useMemo(
    () => new Map(picks.map((pick) => [pick.playerId, pick])),
    [picks]
  );
  const totalCount = sumCounts(picks);
  const atCapacity = totalCount >= maxCount;

  const filteredPlayers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return players;
    return players.filter((p) => p.name.toLowerCase().includes(trimmed));
  }, [players, query]);

  // Always show selected players at the top of the list for quick adjustment.
  const orderedPlayers = useMemo(() => {
    if (filteredPlayers.length === 0) return filteredPlayers;
    const selected: PlayerSummary[] = [];
    const rest: PlayerSummary[] = [];
    for (const p of filteredPlayers) {
      if (pickByPlayerId.has(p.playerId)) selected.push(p);
      else rest.push(p);
    }
    return [...selected, ...rest];
  }, [filteredPlayers, pickByPlayerId]);

  if (players.length === 0) {
    return (
      <div className="text-sm italic text-[color:var(--color-ink-300)] px-3 py-4 rounded-lg bg-[color:var(--color-ink-850)]/60 border border-dashed border-[color:var(--color-ink-700)] text-center">
        {emptyMessage}
      </div>
    );
  }

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
      className={`
        rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/80 overflow-hidden
        ${disabled ? 'opacity-60 pointer-events-none' : ''}
      `}
    >
      {/* Search bar */}
      <div className="relative flex items-center border-b border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60">
        <div className="pl-3 text-[color:var(--color-ink-400)]">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player"
          disabled={disabled}
          className="flex-1 bg-transparent px-2.5 py-2 text-sm text-[color:var(--color-ink-50)] placeholder:text-[color:var(--color-ink-400)] placeholder:font-mono placeholder:tracking-[0.1em] placeholder:text-[0.75rem] placeholder:uppercase outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="pr-3 text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-100)] transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="px-3 font-mono text-[0.6rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-300)] tabular-nums border-l border-[color:var(--color-ink-700)]">
          {totalCount}/{maxCount}
        </span>
      </div>

      {/* Player rows */}
      <div className="max-h-64 overflow-y-auto">
        {orderedPlayers.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-[color:var(--color-ink-300)] italic">
            No matches
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-[color:var(--color-ink-700)]/60">
            {orderedPlayers.map((player) => {
              const pick = pickByPlayerId.get(player.playerId);
              const selected = pick !== undefined;
              const rowDisabled = disabled || (!selected && atCapacity);
              const title =
                rowDisabled && !disabled
                  ? `Maximum ${maxCount} goals`
                  : undefined;
              const incrementDisabled = disabled || atCapacity;

              return (
                <li
                  key={player.playerId}
                  className={`
                    group relative flex items-center gap-3 px-3 py-2
                    transition-colors
                    ${
                      selected
                        ? 'bg-[color:var(--color-volt-200)]/8'
                        : 'hover:bg-[color:var(--color-ink-800)]'
                    }
                    ${rowDisabled && !selected ? 'opacity-50' : ''}
                  `}
                >
                  {selected && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-[color:var(--color-volt-200)]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(player.playerId)}
                    disabled={rowDisabled}
                    title={title}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-not-allowed"
                  >
                    <PlayerAvatar player={player} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[color:var(--color-ink-50)] truncate">
                        {player.name}
                      </div>
                      {player.position && (
                        <div
                          className={`font-mono text-[0.58rem] tracking-[0.22em] uppercase mt-0.5 ${positionTone(player.position)}`}
                        >
                          {player.position}
                        </div>
                      )}
                    </div>
                  </button>
                  {selected ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => decrement(player.playerId)}
                        disabled={disabled}
                        aria-label="Decrease count"
                        className="w-7 h-7 rounded-md border border-[color:var(--color-ink-600)] bg-[color:var(--color-ink-800)] text-[color:var(--color-ink-100)] flex items-center justify-center transition-colors hover:bg-[color:var(--color-ink-750)] hover:border-[color:var(--color-ink-500)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className="min-w-[1.5rem] text-center scoreboard text-sm text-[color:var(--color-volt-200)] tabular-nums"
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
                          !disabled && atCapacity
                            ? `Maximum ${maxCount} goals`
                            : undefined
                        }
                        className="w-7 h-7 rounded-md border border-[color:var(--color-volt-200)]/40 bg-[color:var(--color-volt-200)]/10 text-[color:var(--color-volt-200)] flex items-center justify-center transition-colors hover:bg-[color:var(--color-volt-200)]/20 hover:border-[color:var(--color-volt-200)]/70 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(player.playerId)}
                      disabled={rowDisabled}
                      title={title}
                      aria-label={`Add ${player.name}`}
                      className="w-7 h-7 rounded-md border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)] text-[color:var(--color-ink-400)] flex items-center justify-center transition-colors group-hover:border-[color:var(--color-volt-200)]/50 group-hover:text-[color:var(--color-volt-200)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
