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
import { getScoringRules, updateScoringRules } from '../api/scoringRules';
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
      });
    } catch {
      // swallow; user sees the existing banner
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (loadError || !league || !rules || !draft) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{loadError ?? 'Scoring rules not found'}</span>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user !== null && league.owner.id === user.id;
  const readOnly = !rules.editable || !isOwner;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to={`/leagues/${league.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to league
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Scoring rules</h1>
          <p className="text-gray-600 mt-1">
            {league.name}
          </p>
        </div>

        {!isOwner && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Only the owner can edit these rules.</span>
          </div>
        )}

        {!rules.editable && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{SCORING_LOCKED_MESSAGE}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              {readOnly ? 'Current rules' : 'Edit rules'}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
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
              icon={
                isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )
              }
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
