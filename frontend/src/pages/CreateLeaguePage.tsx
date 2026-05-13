import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LeagueCreationWizard } from '../components/leagues/LeagueCreationWizard';

export function CreateLeaguePage() {
  return (
    <div className="min-h-[calc(100vh-72px)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>

        <div className="mb-10 animate-fade-up">
          <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
            / Create · New league
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
            Build the
            <br />
            <span className="text-[color:var(--color-volt-200)]">contest.</span>
          </h1>
          <p className="mt-5 text-[color:var(--color-ink-200)] max-w-xl">
            A private prediction contest you can run with friends or make open to anyone. Five steps. Two minutes. One season of bragging rights.
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <LeagueCreationWizard />
        </div>
      </div>
    </div>
  );
}
