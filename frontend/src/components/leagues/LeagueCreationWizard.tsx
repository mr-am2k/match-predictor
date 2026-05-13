import { AlertCircle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCompetitions } from '../../api/competitions';
import { createLeague } from '../../api/leagues';
import type { Competition } from '../../types/competition';
import type { CreateLeagueRequest, LeagueVisibility } from '../../types/league';
import type { LeagueScoringRules } from '../../types/scoring';
import {
  DEFAULT_SCORING_RULES,
  hasScoringErrors,
  validateScoringRules,
} from '../../types/scoring';
import { Button } from '../ui/Button';
import { StepCompetition } from './steps/StepCompetition';
import { StepName } from './steps/StepName';
import { StepReview } from './steps/StepReview';
import { StepScoring } from './steps/StepScoring';
import { StepVisibility } from './steps/StepVisibility';

type StepId = 'name' | 'visibility' | 'competition' | 'scoring' | 'review';

const STEP_ORDER: StepId[] = ['name', 'visibility', 'competition', 'scoring', 'review'];

const STEP_LABELS: Record<StepId, string> = {
  name: 'Name',
  visibility: 'Visibility',
  competition: 'Competition',
  scoring: 'Scoring',
  review: 'Review',
};

interface WizardState {
  name: string;
  visibility: LeagueVisibility | null;
  competitionId: number | null;
  scoringRules: LeagueScoringRules;
}

export function LeagueCreationWizard() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<WizardState>({
    name: '',
    visibility: null,
    competitionId: null,
    scoringRules: { ...DEFAULT_SCORING_RULES },
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    listCompetitions()
      .then(setCompetitions)
      .catch(() => {
        // Step will show its own error; no-op here.
      });
  }, []);

  const currentStep = STEP_ORDER[stepIndex];
  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === state.competitionId) ?? null,
    [competitions, state.competitionId]
  );

  const scoringErrors = useMemo(
    () => validateScoringRules(state.scoringRules),
    [state.scoringRules]
  );

  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 'name':
        return state.name.trim().length >= 3 && state.name.trim().length <= 100;
      case 'visibility':
        return state.visibility !== null;
      case 'competition':
        return state.competitionId !== null;
      case 'scoring':
        return !hasScoringErrors(scoringErrors);
      case 'review':
        return (
          state.name.trim().length >= 3 &&
          state.visibility !== null &&
          state.competitionId !== null &&
          selectedCompetition !== null &&
          !hasScoringErrors(scoringErrors)
        );
    }
  }, [currentStep, state, selectedCompetition, scoringErrors]);

  const handleBack = () => {
    setNameError(null);
    setSubmitError(null);
    setStepIndex((idx) => Math.max(0, idx - 1));
  };

  const handleNext = () => {
    setSubmitError(null);
    if (currentStep === 'name') {
      const trimmed = state.name.trim();
      if (trimmed.length < 3) {
        setNameError('Name must be at least 3 characters');
        return;
      }
      if (trimmed.length > 100) {
        setNameError('Name must be 100 characters or fewer');
        return;
      }
      setNameError(null);
    }
    setStepIndex((idx) => Math.min(STEP_ORDER.length - 1, idx + 1));
  };

  const handleSubmit = async () => {
    if (!state.visibility || !state.competitionId) return;
    if (hasScoringErrors(scoringErrors)) return;

    const payload: CreateLeagueRequest = {
      name: state.name.trim(),
      visibility: state.visibility,
      competitionId: state.competitionId,
      scoringRules: state.scoringRules,
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const league = await createLeague(payload);
      navigate(`/leagues/${league.id}`, { state: { justCreated: true } });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create league');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/80 backdrop-blur-[6px] overflow-hidden">
      <div className="px-5 sm:px-8 pt-6 pb-7 border-b border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/40">
        <WizardProgress currentIndex={stepIndex} />
      </div>

      <div className="px-5 sm:px-8 py-8 space-y-8">
        {currentStep === 'name' && (
          <StepName
            name={state.name}
            onChange={(name) => {
              setState((s) => ({ ...s, name }));
              if (nameError) setNameError(null);
            }}
            error={nameError ?? undefined}
          />
        )}

        {currentStep === 'visibility' && (
          <StepVisibility
            visibility={state.visibility}
            onChange={(visibility) => setState((s) => ({ ...s, visibility }))}
          />
        )}

        {currentStep === 'competition' && (
          <StepCompetition
            competitionId={state.competitionId}
            onChange={(competitionId) => setState((s) => ({ ...s, competitionId }))}
          />
        )}

        {currentStep === 'scoring' && (
          <StepScoring
            scoringRules={state.scoringRules}
            onChange={(scoringRules) => setState((s) => ({ ...s, scoringRules }))}
            errors={scoringErrors}
          />
        )}

        {currentStep === 'review' && state.visibility && selectedCompetition && (
          <StepReview
            name={state.name.trim()}
            visibility={state.visibility}
            competition={selectedCompetition}
          />
        )}

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-5 border-t border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/30">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={stepIndex === 0 || isSubmitting}
          icon={<ArrowLeft />}
        >
          Back
        </Button>

        {currentStep !== 'review' ? (
          <Button
            onClick={handleNext}
            disabled={!canAdvance}
            icon={<ArrowRight />}
            iconPosition="right"
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canAdvance || isSubmitting}
            isLoading={isSubmitting}
            icon={<Check />}
            iconPosition="right"
          >
            {isSubmitting ? 'Creating...' : 'Create league'}
          </Button>
        )}
      </div>
    </div>
  );
}

interface WizardProgressProps {
  currentIndex: number;
}

function WizardProgress({ currentIndex }: WizardProgressProps) {
  return (
    <div>
      <div className="hidden sm:flex items-center gap-2">
        {STEP_ORDER.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step} className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-[0.72rem] font-bold tabular-nums transition-colors ${
                    isCompleted
                      ? 'bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)]'
                      : isCurrent
                        ? 'bg-[color:var(--color-ink-850)] text-[color:var(--color-volt-200)] border border-[color:var(--color-volt-200)]/60 shadow-[0_0_0_3px_rgba(215,255,61,0.08)]'
                        : 'bg-[color:var(--color-ink-800)] text-[color:var(--color-ink-400)] border border-[color:var(--color-ink-700)]'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : String(idx + 1).padStart(2, '0')}
                </div>
                {idx < STEP_ORDER.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] transition-colors ${
                      isCompleted ? 'bg-[color:var(--color-volt-200)]' : 'bg-[color:var(--color-ink-700)]'
                    }`}
                  />
                )}
              </div>
              <div
                className={`mt-2.5 font-mono text-[0.62rem] tracking-[0.22em] uppercase truncate transition-colors ${
                  isCurrent
                    ? 'text-[color:var(--color-volt-200)]'
                    : isCompleted
                      ? 'text-[color:var(--color-ink-200)]'
                      : 'text-[color:var(--color-ink-400)]'
                }`}
              >
                {STEP_LABELS[step]}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sm:hidden flex items-center justify-between">
        <div>
          <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-ink-300)]">
            Step {String(currentIndex + 1).padStart(2, '0')} / {String(STEP_ORDER.length).padStart(2, '0')}
          </p>
          <p className="font-display text-xl tracking-wide uppercase text-[color:var(--color-ink-50)] mt-0.5">
            {STEP_LABELS[STEP_ORDER[currentIndex]]}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {STEP_ORDER.map((step, idx) => (
            <span
              key={step}
              className={`block h-1 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 bg-[color:var(--color-volt-200)]'
                  : idx < currentIndex
                    ? 'w-1.5 bg-[color:var(--color-volt-200)]/60'
                    : 'w-1.5 bg-[color:var(--color-ink-700)]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
