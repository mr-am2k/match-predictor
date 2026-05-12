import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FIXTURE_LOCKED_MESSAGE, upsertPrediction } from '../../api/predictions';
import type {
  FixtureWithPrediction,
  MyPrediction,
  PlayerPick,
  UpsertPredictionRequest,
} from '../../types/prediction';
import { Button } from '../ui/Button';
import { PlayerMultiSelect } from './PlayerMultiSelect';

interface MatchPredictionModalProps {
  fixture: FixtureWithPrediction;
  leagueId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: MyPrediction) => void;
}

type WinnerChoice = 'HOME' | 'AWAY' | 'DRAW' | 'NONE';

function deriveChoice(
  prediction: MyPrediction | null,
  homeTeamId: number,
  awayTeamId: number
): WinnerChoice {
  if (!prediction) return 'NONE';
  if (prediction.predictedDraw) return 'DRAW';
  if (prediction.winnerTeamId === homeTeamId) return 'HOME';
  if (prediction.winnerTeamId === awayTeamId) return 'AWAY';
  return 'NONE';
}

function parseScoreInput(value: string): number | null {
  if (value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 20) return null;
  return parsed;
}

export function MatchPredictionModal({
  fixture,
  leagueId,
  open,
  onClose,
  onSaved,
}: MatchPredictionModalProps) {
  const initialPrediction = fixture.userPrediction;
  const initialChoice = deriveChoice(
    initialPrediction,
    fixture.homeTeam.id,
    fixture.awayTeam.id
  );

  const [winnerChoice, setWinnerChoice] = useState<WinnerChoice>(initialChoice);
  const [homeScore, setHomeScore] = useState<string>(
    initialPrediction?.homeScore != null ? String(initialPrediction.homeScore) : ''
  );
  const [awayScore, setAwayScore] = useState<string>(
    initialPrediction?.awayScore != null ? String(initialPrediction.awayScore) : ''
  );
  const [scorerPicks, setScorerPicks] = useState<PlayerPick[]>(
    initialPrediction?.scorers ?? []
  );
  const [assisterPicks, setAssisterPicks] = useState<PlayerPick[]>(
    initialPrediction?.assisters ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLockedError, setIsLockedError] = useState(false);

  // Reset state when the fixture changes or when the modal is re-opened
  useEffect(() => {
    if (!open) return;
    setWinnerChoice(
      deriveChoice(
        fixture.userPrediction,
        fixture.homeTeam.id,
        fixture.awayTeam.id
      )
    );
    setHomeScore(
      fixture.userPrediction?.homeScore != null
        ? String(fixture.userPrediction.homeScore)
        : ''
    );
    setAwayScore(
      fixture.userPrediction?.awayScore != null
        ? String(fixture.userPrediction.awayScore)
        : ''
    );
    setScorerPicks(fixture.userPrediction?.scorers ?? []);
    setAssisterPicks(fixture.userPrediction?.assisters ?? []);
    setErrorMessage(null);
    setIsLockedError(false);
    setSubmitting(false);
  }, [open, fixture]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const combinedSquad = useMemo(
    () => [...fixture.homeSquad, ...fixture.awaySquad],
    [fixture.homeSquad, fixture.awaySquad]
  );
  const squadEmpty = combinedSquad.length === 0;

  const homeScoreNum = parseScoreInput(homeScore);
  const awayScoreNum = parseScoreInput(awayScore);

  const homeSquadIds = useMemo(
    () => new Set(fixture.homeSquad.map((p) => p.playerId)),
    [fixture.homeSquad]
  );
  const awaySquadIds = useMemo(
    () => new Set(fixture.awaySquad.map((p) => p.playerId)),
    [fixture.awaySquad]
  );

  const sumCounts = (picks: PlayerPick[], squadIds: Set<number>) =>
    picks.reduce(
      (acc, pick) => (squadIds.has(pick.playerId) ? acc + pick.count : acc),
      0
    );

  const homeScorerCount = sumCounts(scorerPicks, homeSquadIds);
  const awayScorerCount = sumCounts(scorerPicks, awaySquadIds);
  const homeAssisterCount = sumCounts(assisterPicks, homeSquadIds);
  const awayAssisterCount = sumCounts(assisterPicks, awaySquadIds);

  const scorerTotalCount = scorerPicks.reduce((acc, p) => acc + p.count, 0);
  const assisterTotalCount = assisterPicks.reduce((acc, p) => acc + p.count, 0);

  const bothScoresProvided = homeScoreNum != null && awayScoreNum != null;
  // Caps are derived entirely from the predicted score — no global max.
  const homeSideCap = bothScoresProvided ? (homeScoreNum ?? 0) : 0;
  const awaySideCap = bothScoresProvided ? (awayScoreNum ?? 0) : 0;
  const homeAssisterSideCap = bothScoresProvided ? (homeScoreNum ?? 0) : 0;
  const awayAssisterSideCap = bothScoresProvided ? (awayScoreNum ?? 0) : 0;

  const scorersTotalCap = (homeScoreNum ?? 0) + (awayScoreNum ?? 0);
  const assistersTotalCap = scorersTotalCap;
  const picksDisabled = !bothScoresProvided;
  const picksDisabledHelper = 'Enter both scores before picking scorers or assisters';

  const homeScorerOverCap = bothScoresProvided && homeScorerCount > homeSideCap;
  const awayScorerOverCap = bothScoresProvided && awayScorerCount > awaySideCap;
  const homeAssisterOverCap = bothScoresProvided && homeAssisterCount > homeAssisterSideCap;
  const awayAssisterOverCap = bothScoresProvided && awayAssisterCount > awayAssisterSideCap;

  const pickCapViolation =
    homeScorerOverCap ||
    awayScorerOverCap ||
    homeAssisterOverCap ||
    awayAssisterOverCap;

  const consistencyError = useMemo(() => {
    const homeProvided = homeScore !== '';
    const awayProvided = awayScore !== '';
    if (homeProvided !== awayProvided) {
      return 'Enter both scores or leave both empty.';
    }
    if (homeProvided && (homeScoreNum == null || awayScoreNum == null)) {
      return 'Scores must be whole numbers between 0 and 20.';
    }
    if (homeScoreNum == null || awayScoreNum == null) return null;
    if (winnerChoice === 'HOME' && !(homeScoreNum > awayScoreNum)) {
      return 'Home win selected — home score must be greater than away score.';
    }
    if (winnerChoice === 'AWAY' && !(awayScoreNum > homeScoreNum)) {
      return 'Away win selected — away score must be greater than home score.';
    }
    if (winnerChoice === 'DRAW' && homeScoreNum !== awayScoreNum) {
      return 'Draw selected — home and away scores must match.';
    }
    return null;
  }, [winnerChoice, homeScore, awayScore, homeScoreNum, awayScoreNum]);

  if (!open) return null;

  // The parent only opens this modal for non-locked fixtures (see MatchPredictionCard).
  // A 423 response while editing flips isLockedError and disables Save.
  const saveDisabled =
    submitting || consistencyError !== null || isLockedError || pickCapViolation;

  const handleSave = async () => {
    if (saveDisabled) return;
    setSubmitting(true);
    setErrorMessage(null);

    const winnerTeamId =
      winnerChoice === 'HOME'
        ? fixture.homeTeam.id
        : winnerChoice === 'AWAY'
          ? fixture.awayTeam.id
          : null;
    const predictedDraw = winnerChoice === 'DRAW';

    const body: UpsertPredictionRequest = {
      winnerTeamId,
      predictedDraw,
      homeScore: homeScoreNum,
      awayScore: awayScoreNum,
      scorers: scorerPicks,
      assisters: assisterPicks,
    };

    try {
      const result = await upsertPrediction(leagueId, fixture.id, body);
      onSaved(result);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save prediction';
      if (message === FIXTURE_LOCKED_MESSAGE) {
        setIsLockedError(true);
      }
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const winnerOptions: Array<{ value: WinnerChoice; label: string }> = [
    { value: 'HOME', label: `${fixture.homeTeam.name} win` },
    { value: 'DRAW', label: 'Draw' },
    { value: 'AWAY', label: `${fixture.awayTeam.name} win` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-prediction-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 mb-0.5">Predict</div>
            <h2
              id="match-prediction-modal-title"
              className="text-lg font-semibold text-gray-900 truncate"
            >
              {fixture.homeTeam.name} vs {fixture.awayTeam.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Winner */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Winner</h3>
            <div className="flex flex-wrap gap-2">
              {winnerOptions.map((opt) => {
                const selected = winnerChoice === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWinnerChoice(opt.value)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                      ${
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                );
              })}
              {winnerChoice !== 'NONE' && (
                <button
                  type="button"
                  onClick={() => setWinnerChoice('NONE')}
                  className="px-3 py-2 rounded-lg text-sm font-medium border bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </section>

          {/* Score */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Score</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">
                  {fixture.homeTeam.name}
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="-"
                />
              </div>
              <div className="text-gray-400 font-semibold mt-5">-</div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">
                  {fixture.awayTeam.name}
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="-"
                />
              </div>
            </div>
            {consistencyError && (
              <div className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{consistencyError}</span>
              </div>
            )}
          </section>

          {/* Scorers */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Scorers</h3>
              <span className="text-xs text-gray-500">
                {scorerTotalCount}/{scorersTotalCap} selected
              </span>
            </div>
            {squadEmpty ? (
              <PlayerMultiSelect
                players={[]}
                picks={scorerPicks}
                onChange={setScorerPicks}
                maxCount={homeSideCap + awaySideCap}
                disabled={picksDisabled}
                emptyMessage="Squad data syncing…"
              />
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {fixture.homeTeam.name}
                  </div>
                  <PlayerMultiSelect
                    players={fixture.homeSquad}
                    picks={scorerPicks}
                    onChange={setScorerPicks}
                    maxCount={homeSideCap}
                    disabled={picksDisabled}
                    emptyMessage="Squad data syncing…"
                  />
                  {picksDisabled ? (
                    <p className="text-xs text-gray-500 mt-1">{picksDisabledHelper}</p>
                  ) : homeScorerOverCap ? (
                    <p className="text-xs text-red-500 mt-1">
                      You have {homeScorerCount} picks but only {homeSideCap} allowed — remove some
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Up to {homeSideCap} home picks
                    </p>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {fixture.awayTeam.name}
                  </div>
                  <PlayerMultiSelect
                    players={fixture.awaySquad}
                    picks={scorerPicks}
                    onChange={setScorerPicks}
                    maxCount={awaySideCap}
                    disabled={picksDisabled}
                    emptyMessage="Squad data syncing…"
                  />
                  {picksDisabled ? (
                    <p className="text-xs text-gray-500 mt-1">{picksDisabledHelper}</p>
                  ) : awayScorerOverCap ? (
                    <p className="text-xs text-red-500 mt-1">
                      You have {awayScorerCount} picks but only {awaySideCap} allowed — remove some
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Up to {awaySideCap} away picks
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Assisters */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Assisters</h3>
              <span className="text-xs text-gray-500">
                {assisterTotalCount}/{assistersTotalCap} selected
              </span>
            </div>
            {squadEmpty ? (
              <PlayerMultiSelect
                players={[]}
                picks={assisterPicks}
                onChange={setAssisterPicks}
                maxCount={homeAssisterSideCap + awayAssisterSideCap}
                disabled={picksDisabled}
                emptyMessage="Squad data syncing…"
              />
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {fixture.homeTeam.name}
                  </div>
                  <PlayerMultiSelect
                    players={fixture.homeSquad}
                    picks={assisterPicks}
                    onChange={setAssisterPicks}
                    maxCount={homeAssisterSideCap}
                    disabled={picksDisabled}
                    emptyMessage="Squad data syncing…"
                  />
                  {picksDisabled ? (
                    <p className="text-xs text-gray-500 mt-1">{picksDisabledHelper}</p>
                  ) : homeAssisterOverCap ? (
                    <p className="text-xs text-red-500 mt-1">
                      You have {homeAssisterCount} picks but only {homeAssisterSideCap} allowed — remove some
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Up to {homeAssisterSideCap} home picks
                    </p>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {fixture.awayTeam.name}
                  </div>
                  <PlayerMultiSelect
                    players={fixture.awaySquad}
                    picks={assisterPicks}
                    onChange={setAssisterPicks}
                    maxCount={awayAssisterSideCap}
                    disabled={picksDisabled}
                    emptyMessage="Squad data syncing…"
                  />
                  {picksDisabled ? (
                    <p className="text-xs text-gray-500 mt-1">{picksDisabledHelper}</p>
                  ) : awayAssisterOverCap ? (
                    <p className="text-xs text-red-500 mt-1">
                      You have {awayAssisterCount} picks but only {awayAssisterSideCap} allowed — remove some
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Up to {awayAssisterSideCap} away picks
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div>{errorMessage}</div>
                {isLockedError && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveDisabled} isLoading={submitting}>
            Save prediction
          </Button>
        </div>
      </div>
    </div>
  );
}

// The `locked` state is handled by the parent via the fixture's own `locked`
// flag — the card disables its edit button so this modal doesn't open when locked.
// The 423 path above still guards against the window closing while the user was editing.
