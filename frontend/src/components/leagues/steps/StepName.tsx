import { Input } from '../../ui/Input';

interface StepNameProps {
  name: string;
  onChange: (value: string) => void;
  error?: string;
}

export function StepName({ name, onChange, error }: StepNameProps) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="font-mono text-[0.68rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
          / Step 01 — Identity
        </p>
        <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-[color:var(--color-ink-50)]">
          Name your league.
        </h2>
        <p className="mt-3 text-[color:var(--color-ink-200)] max-w-xl">
          Give this contest a banner. It has to live on the scoreboard all season — make it count.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60 p-5 sm:p-6">
        <Input
          label="League name"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Friday Night Punditry"
          maxLength={100}
          error={error}
          autoFocus
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-[color:var(--color-ink-300)]">
            Minimum 3 characters. Cannot be edited later.
          </p>
          <p className="font-mono tabular-nums text-xs text-[color:var(--color-ink-400)]">
            {name.length}/100
          </p>
        </div>
      </div>
    </div>
  );
}
