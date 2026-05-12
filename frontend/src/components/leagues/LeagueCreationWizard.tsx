import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
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
import { Card, CardContent } from '../ui/Card';
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
    <Card>
      <CardContent className="py-8 sm:px-8 space-y-8">
        <WizardProgress currentIndex={stepIndex} />

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
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={stepIndex === 0 || isSubmitting}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          {currentStep !== 'review' ? (
            <Button onClick={handleNext} disabled={!canAdvance}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canAdvance || isSubmitting}
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            >
              {isSubmitting ? 'Creating...' : 'Create league'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface WizardProgressProps {
  currentIndex: number;
}

function WizardProgress({ currentIndex }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {STEP_ORDER.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <div key={step} className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isCompleted
                    ? 'bg-indigo-600 text-white'
                    : isCurrent
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              {idx < STEP_ORDER.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    isCompleted ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
            <div
              className={`mt-2 text-xs font-medium truncate ${
                isCurrent ? 'text-indigo-700' : 'text-gray-500'
              }`}
            >
              {STEP_LABELS[step]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
