import { Check } from 'lucide-react';
import type { Competition } from '../../types/competition';

interface CompetitionPickerProps {
  competitions: Competition[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function CompetitionPicker({ competitions, selectedId, onSelect }: CompetitionPickerProps) {
  if (competitions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/40 py-14 px-6 text-center">
        <p className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-400)] mb-2">
          /  Empty board
        </p>
        <p className="text-sm text-[color:var(--color-ink-200)]">
          No competitions are currently available. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 stagger">
      {competitions.map((competition) => {
        const isSelected = competition.id === selectedId;
        return (
          <button
            key={competition.id}
            type="button"
            onClick={() => onSelect(competition.id)}
            className={`group relative text-left p-5 rounded-2xl border transition-all duration-200 overflow-hidden ${
              isSelected
                ? 'border-[color:var(--color-volt-200)]/60 bg-[color:var(--color-ink-850)] shadow-[0_0_0_1px_rgba(215,255,61,0.2),0_20px_60px_-30px_rgba(215,255,61,0.25)]'
                : 'border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/70 hover:border-[color:var(--color-ink-500)]'
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] grid place-items-center">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              {competition.logoUrl ? (
                <img
                  src={competition.logoUrl}
                  alt=""
                  className="w-11 h-11 object-contain flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg tracking-wide uppercase text-[color:var(--color-ink-50)] truncate">
                  {competition.name}
                </div>
                <div className="text-xs text-[color:var(--color-ink-300)] flex items-center gap-1.5 mt-0.5">
                  {competition.countryFlagUrl && (
                    <img
                      src={competition.countryFlagUrl}
                      alt=""
                      className="w-4 h-3 object-cover rounded-sm"
                      loading="lazy"
                    />
                  )}
                  <span className="truncate">{competition.countryName ?? 'International'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-400)]">
                Season
              </span>
              <span className="font-mono tabular-nums text-sm text-[color:var(--color-volt-200)]">
                {competition.seasonYear}
              </span>
            </div>
            <div
              className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 bg-[color:var(--color-volt-200)] ${
                isSelected ? 'w-full' : 'w-0 group-hover:w-1/3'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
