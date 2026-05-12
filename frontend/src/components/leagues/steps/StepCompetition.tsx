import { Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listCompetitions } from '../../../api/competitions';
import type { Competition } from '../../../types/competition';
import { CompetitionPicker } from '../CompetitionPicker';

interface StepCompetitionProps {
  competitionId: number | null;
  onChange: (id: number) => void;
}

export function StepCompetition({ competitionId, onChange }: StepCompetitionProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listCompetitions()
      .then((data) => {
        if (cancelled) return;
        setCompetitions(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load competitions');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pick a competition</h2>
        <p className="text-gray-600 mt-1">
          Your league will run for the selected competition's current season.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && (
        <CompetitionPicker
          competitions={competitions}
          selectedId={competitionId}
          onSelect={onChange}
        />
      )}
    </div>
  );
}
