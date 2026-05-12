import { AlertCircle, Minus, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

// Big +/- score stepper with mono display.
function ScoreStepper({
  label,
  crestUrl,
  teamName,
  value,
  onChange,
  disabled,
}: {
  label: string;
  crestUrl: string | null;
  teamName: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const numeric = parseScoreInput(value);
  const display = numeric == null ? (value === '' ? '-' : value) : String(numeric);

  const bump = (delta: number) => {
    const base = numeric ?? 0;
    const next = Math.max(0, Math.min(20, base + delta));
    onChange(String(next));
  };

  return (
    <div className="flex-1 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)] flex items-center justify-center overflow-hidden flex-shrink-0">
          {crestUrl ? (
            <img src={crestUrl} alt="" className="w-6 h-6 object-contain" />
          ) : (
            <span className="font-display text-sm text-[color:var(--color-ink-200)] leading-none">
              {teamName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[0.55rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)]">
            {label}
          </p>
          <p className="font-display text-sm sm:text-base tracking-wide uppercase text-[color:var(--color-ink-50)] truncate leading-none mt-0.5">
            {teamName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={disabled || (numeric ?? 0) <= 0}
          aria-label={`Decrease ${label} score`}
          className="w-10 h-12 rounded-lg border border-[color:var(--color-ink-600)] bg-[color:var(--color-ink-800)] text-[color:var(--color-ink-100)] flex items-center justify-center transition-colors hover:bg-[color:var(--color-ink-750)] hover:border-[color:var(--color-ink-500)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="-"
          aria-label={`${teamName} score`}
          className="flex-1 h-12 rounded-lg bg-[color:var(--color-ink-850)] border border-[color:var(--color-ink-700)] focus:border-[color:var(--color-volt-200)]/70 outline-none scoreboard text-3xl sm:text-4xl text-center text-[color:var(--color-ink-50)] tabular-nums disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => bump(+1)}
          disabled={disabled || (numeric ?? 0) >= 20}
          aria-label={`Increase ${label} score`}
          className="w-10 h-12 rounded-lg border border-[color:var(--color-volt-200)]/40 bg-[color:var(--color-volt-200)]/10 text-[color:var(--color-volt-200)] flex items-center justify-center transition-colors hover:bg-[color:var(--color-volt-200)]/20 hover:border-[color:var(--color-volt-200)]/70 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden to preserve the display-only readout above when user typed invalid string */}
      {numeric == null && value !== '' && (
        <p className="mt-2 font-mono text-[0.6rem] tracking-[0.16em] uppercase text-[color:var(--color-loss-500)]">
          Invalid · "{display}"
        </p>
      )}
    </div>
  );
}

function WinnerPill({
  active,
  onClick,
  children,
  tone = 'default',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'home' | 'away' | 'draw' | 'default';
}) {
  const activeTone =
    tone === 'draw'
      ? 'bg-[color:var(--color-draw-500)]/15 border-[color:var(--color-draw-500)]/60 text-[color:var(--color-draw-500)]'
      : 'bg-[color:var(--color-volt-200)] border-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] shadow-[0_0_0_1px_rgba(215,255,61,0.35),0_8px_24px_-10px_rgba(215,255,61,0.55)]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 px-3 py-2.5 rounded-lg border text-sm font-semibold tracking-wide
        transition-[background-color,border-color,color,box-shadow] duration-150
        ${
          active
            ? activeTone
            : 'bg-[color:var(--color-ink-850)]/70 border-[color:var(--color-ink-700)] text-[color:var(--color-ink-100)] hover:bg-[color:var(--color-ink-800)] hover:border-[color:var(--color-ink-500)]'
        }
      `}
    >
      {children}
    </button>
  );
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

  const dialogRef = useRef<HTMLDivElement>(null);

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

  // Close on Escape + body scroll lock
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = originalOverflow;
    };
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
  const homeSideCap = bothScoresProvided ? (homeScoreNum ?? 0) : 0;
  const awaySideCap = bothScoresProvided ? (awayScoreNum ?? 0) : 0;
  const homeAssisterSideCap = bothScoresProvided ? (homeScoreNum ?? 0) : 0;
  const awayAssisterSideCap = bothScoresProvided ? (awayScoreNum ?? 0) : 0;

  const scorersTotalCap = (homeScoreNum ?? 0) + (awayScoreNum ?? 0);
  const assistersTotalCap = scorersTotalCap;
  const picksDisabled = !bothScoresProvided;
  const picksDisabledHelper = 'Enter both scores first';

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[color:var(--color-ink-950)]/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      aria-hidden={false}
    >
      <div
        ref={dialogRef}
        className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col
          bg-[color:var(--color-ink-850)] border border-[color:var(--color-ink-700)]
          rounded-t-3xl sm:rounded-2xl overflow-hidden
          shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]
          animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-prediction-modal-title"
      >
        {/* Drag handle on mobile */}
        <div
          aria-hidden
          className="sm:hidden flex justify-center pt-2 pb-1"
        >
          <span className="w-10 h-1 rounded-full bg-[color:var(--color-ink-600)]" />
        </div>

        {/* Header with crests */}
        <header className="relative px-5 sm:px-8 pt-4 sm:pt-6 pb-5 border-b border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60">
          <div
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-[color:var(--color-volt-200)]"
          />
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-[color:var(--color-volt-200)] mb-1.5">
                / Match prediction
              </p>
              <h2
                id="match-prediction-modal-title"
                className="font-display text-2xl sm:text-3xl tracking-wide text-[color:var(--color-ink-50)] leading-none truncate"
              >
                {fixture.homeTeam.name} <span className="text-[color:var(--color-ink-500)]">VS</span>{' '}
                {fixture.awayTeam.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1 rounded-lg text-[color:var(--color-ink-300)] hover:bg-[color:var(--color-ink-800)] hover:text-[color:var(--color-ink-50)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Team crest strip */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {fixture.homeTeam.logoUrl ? (
                  <img
                    src={fixture.homeTeam.logoUrl}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                ) : (
                  <span className="font-display text-base text-[color:var(--color-ink-200)]">
                    {fixture.homeTeam.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] truncate">
                Home
              </span>
            </div>
            <span className="font-mono text-[0.6rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-500)]">
              VS
            </span>
            <div className="flex items-center gap-3 justify-end flex-row-reverse min-w-0">
              <div className="w-10 h-10 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {fixture.awayTeam.logoUrl ? (
                  <img
                    src={fixture.awayTeam.logoUrl}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                ) : (
                  <span className="font-display text-base text-[color:var(--color-ink-200)]">
                    {fixture.awayTeam.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] truncate">
                Away
              </span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-8">
          {/* Winner */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)]">
                / Winner
              </span>
              {winnerChoice !== 'NONE' && (
                <button
                  type="button"
                  onClick={() => setWinnerChoice('NONE')}
                  className="ml-auto font-mono text-[0.6rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-100)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <WinnerPill
                active={winnerChoice === 'HOME'}
                onClick={() => setWinnerChoice('HOME')}
                tone="home"
              >
                {fixture.homeTeam.name} win
              </WinnerPill>
              <WinnerPill
                active={winnerChoice === 'DRAW'}
                onClick={() => setWinnerChoice('DRAW')}
                tone="draw"
              >
                Draw
              </WinnerPill>
              <WinnerPill
                active={winnerChoice === 'AWAY'}
                onClick={() => setWinnerChoice('AWAY')}
                tone="away"
              >
                {fixture.awayTeam.name} win
              </WinnerPill>
            </div>
          </section>

          {/* Score */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)]">
                / Score
              </span>
              {bothScoresProvided && (
                <span className="ml-auto font-mono text-[0.62rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-300)] tabular-nums">
                  {homeScoreNum} – {awayScoreNum}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <ScoreStepper
                label="Home"
                crestUrl={fixture.homeTeam.logoUrl}
                teamName={fixture.homeTeam.name}
                value={homeScore}
                onChange={setHomeScore}
              />
              <ScoreStepper
                label="Away"
                crestUrl={fixture.awayTeam.logoUrl}
                teamName={fixture.awayTeam.name}
                value={awayScore}
                onChange={setAwayScore}
              />
            </div>
            {consistencyError && (
              <div className="mt-3 flex items-start gap-2 text-xs text-[color:var(--color-loss-500)]">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{consistencyError}</span>
              </div>
            )}
          </section>

          {/* Scorers */}
          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)]">
                / Scorers
              </span>
              <span className="font-mono text-[0.6rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-300)] tabular-nums">
                {scorerTotalCount}/{scorersTotalCap} picked
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
                  <div className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mb-2">
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
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] mt-2">
                      {picksDisabledHelper}
                    </p>
                  ) : homeScorerOverCap ? (
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-loss-500)] mt-2">
                      {homeScorerCount} picked · only {homeSideCap} allowed
                    </p>
                  ) : (
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] mt-2">
                      Up to {homeSideCap} home picks
                    </p>
                  )}
                </div>
                <div>
                  <div className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mb-2">
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
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] mt-2">
                      {picksDisabledHelper}
                    </p>
                  ) : awayScorerOverCap ? (
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-loss-500)] mt-2">
                      {awayScorerCount} picked · only {awaySideCap} allowed
                    </p>
                  ) : (
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] mt-2">
                      Up to {awaySideCap} away picks
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Assisters */}
          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)]">
                / Assisters
              </span>
              <span className="font-mono text-[0.6rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-300)] tabular-nums">
                {assisterTotalCount}/{assistersTotalCap} picked
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
                  <div className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mb-2">
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
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] mt-2">
                      {picksDisabledHelper}
                    </p>
                  ) : homeAssisterOverCap ? (
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-loss-500)] mt-2">
                      {homeAssisterCount} picked · only {homeAssisterSideCap} allowed
                    </p>
                  ) : (
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] mt-2">
                      Up to {homeAssisterSideCap} home picks
                    </p>
                  )}
                </div>
                <div>
                  <div className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mb-2">
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
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] mt-2">
                      {picksDisabledHelper}
                    </p>
                  ) : awayAssisterOverCap ? (
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-loss-500)] mt-2">
                      {awayAssisterCount} picked · only {awayAssisterSideCap} allowed
                    </p>
                  ) : (
                    <p className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[color:var(--color-ink-400)] mt-2">
                      Up to {awayAssisterSideCap} away picks
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-[color:var(--color-loss-500)]/8 border border-[color:var(--color-loss-500)]/40 text-[color:var(--color-loss-500)] text-sm flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase mb-1 text-[color:var(--color-loss-500)]">
                  Error
                </div>
                <div className="text-[color:var(--color-ink-100)]">{errorMessage}</div>
                {isLockedError && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-3 inline-flex items-center gap-1.5 font-mono text-[0.65rem] tracking-[0.18em] uppercase text-[color:var(--color-loss-500)] hover:text-[color:var(--color-loss-600)] transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 sm:px-8 py-4 border-t border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/60 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveDisabled} isLoading={submitting}>
            Save prediction
          </Button>
        </footer>
      </div>
    </div>
  );
}

// The `locked` state is handled by the parent via the fixture's own `locked`
// flag — the card disables its edit button so this modal doesn't open when locked.
// The 423 path above still guards against the window closing while the user was editing.
