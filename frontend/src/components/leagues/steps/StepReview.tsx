import { Globe, Lock } from 'lucide-react';
import type { Competition } from '../../../types/competition';
import type { LeagueVisibility } from '../../../types/league';

interface StepReviewProps {
  name: string;
  visibility: LeagueVisibility;
  competition: Competition;
}

export function StepReview({ name, visibility, competition }: StepReviewProps) {
  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="font-mono text-[0.68rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
          / Step 05 — Final whistle
        </p>
        <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)]">
          Review & launch.
        </h2>
        <p className="mt-3 text-[color:var(--color-ink-200)] max-w-xl">
          Last look before the league goes live. Members will see exactly what you've set up.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/70 overflow-hidden">
        <div className="relative p-6 sm:p-8 border-b border-[color:var(--color-ink-700)] overflow-hidden">
          <div aria-hidden className="absolute inset-0 stadium-mesh opacity-40 pointer-events-none" />
          <div className="relative">
            <p className="font-mono text-[0.6rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)] mb-3">
              League name
            </p>
            <h3 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9] break-words">
              {name}
            </h3>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--color-ink-700)]">
          <div className="p-6">
            <p className="font-mono text-[0.6rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)] mb-3">
              Visibility
            </p>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg grid place-items-center ${
                  visibility === 'PRIVATE'
                    ? 'bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] text-[color:var(--color-ink-100)]'
                    : 'bg-[color:var(--color-volt-200)]/10 border border-[color:var(--color-volt-200)]/30 text-[color:var(--color-volt-200)]'
                }`}
              >
                {visibility === 'PRIVATE' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-display text-xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
                  {visibility === 'PRIVATE' ? 'Private' : 'Public'}
                </p>
                <p className="text-xs text-[color:var(--color-ink-300)]">
                  {visibility === 'PRIVATE' ? 'Invite-only join link' : 'Discoverable in browse feed'}
                </p>
              </div>
            </div>
            {visibility === 'PRIVATE' && (
              <p className="mt-3 text-xs text-[color:var(--color-ink-400)] leading-relaxed">
                We'll generate a join link you can share with friends after you create the league.
              </p>
            )}
          </div>

          <div className="p-6">
            <p className="font-mono text-[0.6rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)] mb-3">
              Competition
            </p>
            <div className="flex items-center gap-3">
              {competition.logoUrl && (
                <img
                  src={competition.logoUrl}
                  alt=""
                  className="w-10 h-10 object-contain flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="font-display text-xl tracking-wide uppercase text-[color:var(--color-ink-50)] truncate">
                  {competition.name}
                </p>
                <p className="font-mono text-xs tabular-nums text-[color:var(--color-volt-200)] mt-0.5">
                  Season {competition.seasonYear}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
