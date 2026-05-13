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
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="font-mono text-[0.68rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
          / Step 03 — Fixture list
        </p>
        <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)]">
          Pick a competition.
        </h2>
        <p className="mt-3 text-[color:var(--color-ink-200)] max-w-xl">
          Your league runs for the selected competition's current season. Every fixture is in play.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-[color:var(--color-ink-300)]">
          <Loader2 className="w-6 h-6 animate-spin text-[color:var(--color-volt-200)]" />
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
