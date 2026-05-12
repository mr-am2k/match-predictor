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
      <div className="text-center py-12 text-gray-500">
        No competitions are currently available. Please check back later.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {competitions.map((competition) => {
        const isSelected = competition.id === selectedId;
        return (
          <button
            key={competition.id}
            type="button"
            onClick={() => onSelect(competition.id)}
            className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              {competition.logoUrl ? (
                <img
                  src={competition.logoUrl}
                  alt=""
                  className="w-10 h-10 object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">{competition.name}</div>
                <div className="text-sm text-gray-600 flex items-center gap-1.5">
                  {competition.countryFlagUrl && (
                    <img
                      src={competition.countryFlagUrl}
                      alt=""
                      className="w-4 h-3 object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="truncate">{competition.countryName ?? 'International'}</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Season {competition.seasonYear}</div>
          </button>
        );
      })}
    </div>
  );
}
