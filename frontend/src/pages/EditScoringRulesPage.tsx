import {
  AlertCircle,
  ArrowLeft,
  Check,
  Lock,
  Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLeague } from '../api/leagues';
import { getScoringRules, updateScoringRules, setPenaltiesEnabled } from '../api/scoringRules';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { ScoringRulesTable } from '../components/leagues/ScoringRulesTable';
import { useAuth } from '../context/AuthContext';
import type { League } from '../types/league';
import type {
  LeagueScoringRules,
  LeagueScoringRulesResponse,
} from '../types/scoring';
import {
  SCORING_LOCKED_MESSAGE,
  hasScoringErrors,
  validateScoringRules,
} from '../types/scoring';

export function EditScoringRulesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [rules, setRules] = useState<LeagueScoringRulesResponse | null>(null);
  const [draft, setDraft] = useState<LeagueScoringRules | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([getLeague(id), getScoringRules(id)])
      .then(([leagueData, rulesData]) => {
        if (cancelled) return;
        setLeague(leagueData);
        setRules(rulesData);
        setDraft({
          matchWinnerPoints: rulesData.matchWinnerPoints,
          matchExactScorePoints: rulesData.matchExactScorePoints,
          matchScorerPoints: rulesData.matchScorerPoints,
          matchAssisterPoints: rulesData.matchAssisterPoints,
          leagueWinnerPoints: rulesData.leagueWinnerPoints,
          leagueTopScorerPoints: rulesData.leagueTopScorerPoints,
          leagueTopAssisterPoints: rulesData.leagueTopAssisterPoints,
          matchBonus2x: rulesData.matchBonus2x,
          matchBonus3x: rulesData.matchBonus3x,
          matchBonus4x: rulesData.matchBonus4x,
          leagueBonus2of3: rulesData.leagueBonus2of3,
          leagueBonus3of3: rulesData.leagueBonus3of3,
          assistersEnabled: rulesData.assistersEnabled,
          penaltiesEnabled: rulesData.penaltiesEnabled,
          penaltyWinnerPoints: rulesData.penaltyWinnerPoints,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load scoring rules');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const errors = useMemo(
    () => (draft ? validateScoringRules(draft) : {}),
    [draft]
  );

  const reloadRules = async () => {
    if (!id) return;
    try {
      const fresh = await getScoringRules(id);
      setRules(fresh);
      setDraft({
        matchWinnerPoints: fresh.matchWinnerPoints,
        matchExactScorePoints: fresh.matchExactScorePoints,
        matchScorerPoints: fresh.matchScorerPoints,
        matchAssisterPoints: fresh.matchAssisterPoints,
        leagueWinnerPoints: fresh.leagueWinnerPoints,
        leagueTopScorerPoints: fresh.leagueTopScorerPoints,
        leagueTopAssisterPoints: fresh.leagueTopAssisterPoints,
        matchBonus2x: fresh.matchBonus2x,
        matchBonus3x: fresh.matchBonus3x,
        matchBonus4x: fresh.matchBonus4x,
        leagueBonus2of3: fresh.leagueBonus2of3,
        leagueBonus3of3: fresh.leagueBonus3of3,
        assistersEnabled: fresh.assistersEnabled,
        penaltiesEnabled: fresh.penaltiesEnabled,
        penaltyWinnerPoints: fresh.penaltyWinnerPoints,
      });
    } catch {
      // swallow; user sees the existing banner
    }
  };

  const handleTogglePenalties = async (enabled: boolean) => {
    if (!id) return;
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const updated = await setPenaltiesEnabled(id, enabled);
      setRules(updated);
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              penaltiesEnabled: updated.penaltiesEnabled,
              penaltyWinnerPoints: updated.penaltyWinnerPoints,
            }
          : prev
      );
      setSuccessMessage(
        enabled ? 'Knockout penalties enabled.' : 'Knockout penalties disabled.'
      );
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update penalties');
    }
  };

  const handleSave = async () => {
    if (!id || !draft) return;
    if (hasScoringErrors(errors)) {
      setSaveError('Fix the highlighted fields before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const updated = await updateScoringRules(id, draft);
      setRules(updated);
      setSuccessMessage('Scoring rules saved.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save scoring rules';
      setSaveError(message);
      if (message === SCORING_LOCKED_MESSAGE) {
        await reloadRules();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[color:var(--color-volt-200)] animate-spin" />
      </div>
    );
  }

  if (loadError || !league || !rules || !draft) {
    return (
      <div className="min-h-[calc(100vh-72px)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-14 space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{loadError ?? 'Scoring rules not found'}</span>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft />}
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user !== null && league.owner.id === user.id;
  const isAdmin = user !== null && user.role === 'ADMIN';
  // Admins can edit any league's rules mid-season (including the assister
  // toggle), bypassing the locked-once-predictions guard. Owners keep the
  // original behaviour: editable only until the first prediction lands.
  const canEdit = isOwner || isAdmin;
  const readOnly = !canEdit || (!isAdmin && !rules.editable);

  return (
    <div className="min-h-[calc(100vh-72px)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14 space-y-8">
        <Link
          to={`/leagues/${league.id}`}
          className="inline-flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to league
        </Link>

        <div className="animate-fade-up">
          <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
            / Scoring rules
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
            {readOnly ? 'Rules on file.' : 'Tune the engine.'}
          </h1>
          <p className="mt-4 text-[color:var(--color-ink-200)] max-w-xl">
            <span className="font-display text-lg tracking-wide uppercase text-[color:var(--color-ink-100)] mr-2">
              {league.name}
            </span>
          </p>
        </div>

        <div className="space-y-3">
          {!canEdit && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-draw-500)]/40 bg-[color:var(--color-draw-500)]/8 text-[color:var(--color-draw-500)] text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-[color:var(--color-ink-100)]">Only the owner can edit these rules.</span>
            </div>
          )}

          {!rules.editable && !isAdmin && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-draw-500)]/40 bg-[color:var(--color-draw-500)]/8">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-[color:var(--color-draw-500)]" />
              <span className="text-sm text-[color:var(--color-ink-100)]">{SCORING_LOCKED_MESSAGE}</span>
            </div>
          )}

          {!rules.editable && isAdmin && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-volt-200)]/40 bg-[color:var(--color-volt-200)]/8">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[color:var(--color-volt-200)]" />
              <span className="text-sm text-[color:var(--color-ink-100)]">
                Admin override — predictions already exist in this league. Changes apply only to fixtures
                that settle from now on; past results keep their points.
              </span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-win-500)]/40 bg-[color:var(--color-win-500)]/8 text-[color:var(--color-win-500)] text-sm">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <p className="font-mono text-[0.62rem] tracking-[0.25em] uppercase text-[color:var(--color-volt-200)] mb-2">
              / {readOnly ? 'Viewing' : 'Editing'}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
              {readOnly ? 'Current rules' : 'Edit rules'}
            </h2>
            <p className="text-sm text-[color:var(--color-ink-200)] mt-1">
              {readOnly
                ? 'Review how points are awarded in this league.'
                : 'Changes apply immediately once saved.'}
            </p>
          </CardHeader>
          <CardContent>
            <ScoringRulesTable
              value={draft}
              onChange={setDraft}
              readOnly={readOnly}
              errors={errors}
              onTogglePenalties={canEdit ? handleTogglePenalties : undefined}
            />
          </CardContent>
        </Card>

        {!readOnly && (
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || hasScoringErrors(errors)}
              isLoading={isSaving}
              icon={<Check />}
              iconPosition="right"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
