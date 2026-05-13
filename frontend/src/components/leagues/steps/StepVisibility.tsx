import { Check, Globe, Lock } from 'lucide-react';
import type { LeagueVisibility } from '../../../types/league';

interface StepVisibilityProps {
  visibility: LeagueVisibility | null;
  onChange: (value: LeagueVisibility) => void;
}

const options: Array<{
  value: LeagueVisibility;
  title: string;
  description: string;
  tag: string;
  icon: typeof Globe;
}> = [
  {
    value: 'PUBLIC',
    title: 'Public',
    description: 'Listed in the browse feed. Anyone can discover and join without an invite.',
    tag: 'OPEN JOIN',
    icon: Globe,
  },
  {
    value: 'PRIVATE',
    title: 'Private',
    description: 'Invite-only. Share a join link or 6-character code with your crew.',
    tag: 'INVITE ONLY',
    icon: Lock,
  },
];

export function StepVisibility({ visibility, onChange }: StepVisibilityProps) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="font-mono text-[0.68rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
          / Step 02 — Access
        </p>
        <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)]">
          Who's getting in?
        </h2>
        <p className="mt-3 text-[color:var(--color-ink-200)] max-w-xl">
          Pick the gate. Public leagues are loud and visible. Private leagues live on a whispered code.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 stagger">
        {options.map((option) => {
          const isSelected = visibility === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`relative text-left p-6 sm:p-7 rounded-2xl border transition-all duration-200 overflow-hidden group ${
                isSelected
                  ? 'border-[color:var(--color-volt-200)]/60 bg-[color:var(--color-ink-850)] shadow-[0_0_0_1px_rgba(215,255,61,0.2),0_20px_60px_-30px_rgba(215,255,61,0.25)]'
                  : 'border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/70 hover:border-[color:var(--color-ink-500)]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] grid place-items-center">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
              )}
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 border transition-colors ${
                  isSelected
                    ? 'bg-[color:var(--color-volt-200)]/10 border-[color:var(--color-volt-200)]/40 text-[color:var(--color-volt-200)]'
                    : 'bg-[color:var(--color-ink-800)] border-[color:var(--color-ink-700)] text-[color:var(--color-ink-200)] group-hover:text-[color:var(--color-ink-50)]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)] mb-2">
                {option.tag}
              </p>
              <h3 className="font-display text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)] mb-2">
                {option.title}
              </h3>
              <p className="text-sm text-[color:var(--color-ink-200)] leading-relaxed">
                {option.description}
              </p>
              <div
                className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 bg-[color:var(--color-volt-200)] ${
                  isSelected ? 'w-full' : 'w-0 group-hover:w-1/3'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
