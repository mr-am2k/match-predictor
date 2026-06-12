import { Eye, Lock, Pencil } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '../ui/Button';
import type {
  FixtureWithPrediction,
  PlayerPick,
} from '../../types/prediction';
import { LockCountdown } from './LockCountdown';
import { PointsBreakdown } from './PointsBreakdown';

interface MatchPredictionCardProps {
  fixture: FixtureWithPrediction;
  onEdit: () => void;
  onReveal: () => void;
}

const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN']);
const HOUR_MS = 60 * 60 * 1000;
const TWO_HOUR_MS = 2 * HOUR_MS;

function formatKickoff(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatPicks(
  picks: PlayerPick[],
  nameById: Map<number, string>
): string {
  return picks
    .map((pick) => {
      const name = nameById.get(pick.playerId) ?? `Player #${pick.playerId}`;
      return pick.count > 1 ? `${name} ×${pick.count}` : name;
    })
    .join(', ');
}

type OutcomeTone = 'home' | 'away' | 'draw' | 'none';

function predictionOutcome(fixture: FixtureWithPrediction): OutcomeTone {
  const p = fixture.userPrediction;
  if (!p) return 'none';
  if (p.predictedDraw) return 'draw';
  if (p.winnerTeamId === fixture.homeTeam.id) return 'home';
  if (p.winnerTeamId === fixture.awayTeam.id) return 'away';
  return 'none';
}

function outcomeChip(outcome: OutcomeTone, fixture: FixtureWithPrediction) {
  switch (outcome) {
    case 'home':
      return {
        label: `${fixture.homeTeam.name.toUpperCase()} WIN`,
        className: 'chip chip-win',
      };
    case 'away':
      return {
        label: `${fixture.awayTeam.name.toUpperCase()} WIN`,
        className: 'chip chip-win',
      };
    case 'draw':
      return { label: 'Draw', className: 'chip chip-draw' };
    default:
      return null;
  }
}

function TeamCrest({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)] flex items-center justify-center flex-shrink-0 overflow-hidden">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
        />
      ) : (
        <span className="font-display text-xl text-[color:var(--color-ink-200)] leading-none">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function MatchPredictionCard({
  fixture,
  onEdit,
  onReveal,
}: MatchPredictionCardProps) {
  const isFinal = FINAL_STATUSES.has(fixture.status);
  const showActualScore =
    isFinal && fixture.homeScore !== null && fixture.awayScore !== null;
  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const player of fixture.homeSquad) {
      map.set(player.playerId, player.name);
    }
    for (const player of fixture.awaySquad) {
      map.set(player.playerId, player.name);
    }
    return map;
  }, [fixture.homeSquad, fixture.awaySquad]);

  const hasPrediction = fixture.userPrediction !== null;
  const locked = fixture.locked;

  // Show per-fixture countdown only in the final hour before kickoff.
  const kickoffMs = new Date(fixture.kickoffAt).getTime();
  const nowMs = Date.now();
  const timeUntilKickoff = kickoffMs - nowMs;
  const kickoffSoon =
    !Number.isNaN(kickoffMs) &&
    timeUntilKickoff > 0 &&
    timeUntilKickoff <= TWO_HOUR_MS;
  const withinCountdownWindow =
    !locked &&
    !isFinal &&
    !Number.isNaN(kickoffMs) &&
    timeUntilKickoff <= HOUR_MS;

  const outcome = predictionOutcome(fixture);
  const chip = outcomeChip(outcome, fixture);

  const p = fixture.userPrediction;
  const predHome = p?.homeScore;
  const predAway = p?.awayScore;
  const hasScore = p != null && predHome != null && predAway != null;
  const points = p?.points ?? null;

  return (
    <article
      className={`
        relative rounded-2xl border bg-[color:var(--color-ink-850)]/85 backdrop-blur-[6px]
        transition-[border-color,transform,box-shadow] duration-300 ease-out
        ${
          locked
            ? 'border-[color:var(--color-ink-700)] opacity-95'
            : isFinal
              ? 'border-[color:var(--color-ink-700)]'
              : 'border-[color:var(--color-ink-700)] hover:border-[color:var(--color-ink-500)] hover:-translate-y-0.5'
        }
      `}
    >
      {/* Top meta row */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-4 pb-3">
        <span
          className={`font-mono text-[0.62rem] sm:text-[0.65rem] tracking-[0.18em] uppercase tabular-nums ${
            kickoffSoon
              ? 'text-[color:var(--color-volt-200)]'
              : 'text-[color:var(--color-ink-300)]'
          }`}
        >
          {formatKickoff(fixture.kickoffAt)}
        </span>
        {isFinal ? (
          <span className="chip">Final</span>
        ) : locked ? (
          <LockCountdown locksAt={fixture.lockedAt} />
        ) : withinCountdownWindow ? (
          <LockCountdown locksAt={fixture.lockedAt} />
        ) : (
          <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)]">
            {fixture.status}
          </span>
        )}
      </div>

      <div className="tick-divider mx-4 sm:mx-6" />

      {/* Scorecard */}
      <div className="px-4 sm:px-6 py-5">
        {/* Mobile: stacked. Desktop: home | score | away */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
          {/* HOME */}
          <div className="flex items-center gap-3 min-w-0">
            <TeamCrest
              name={fixture.homeTeam.name}
              logoUrl={fixture.homeTeam.logoUrl}
            />
            <div className="min-w-0">
              <p className="font-mono text-[0.55rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] mb-1">
                Home
              </p>
              <h3 className="font-display text-lg sm:text-2xl tracking-wide text-[color:var(--color-ink-50)] truncate leading-none">
                {fixture.homeTeam.name}
              </h3>
            </div>
          </div>

          {/* SCORE CENTRE */}
          <div className="flex flex-col items-center gap-1 px-2 sm:px-4">
            {showActualScore ? (
              <>
                <span className="font-mono text-[0.55rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)]">
                  Final
                </span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="scoreboard text-3xl sm:text-5xl text-[color:var(--color-ink-50)] tabular-nums">
                    {fixture.homeScore}
                  </span>
                  <span className="font-mono text-sm text-[color:var(--color-ink-500)]">
                    –
                  </span>
                  <span className="scoreboard text-3xl sm:text-5xl text-[color:var(--color-ink-50)] tabular-nums">
                    {fixture.awayScore}
                  </span>
                </div>
              </>
            ) : hasScore ? (
              <>
                <span className="font-mono text-[0.55rem] tracking-[0.22em] uppercase text-[color:var(--color-volt-200)]">
                  Your call
                </span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="scoreboard text-3xl sm:text-5xl text-[color:var(--color-ink-50)] tabular-nums">
                    {predHome}
                  </span>
                  <span className="font-mono text-sm text-[color:var(--color-ink-500)]">
                    –
                  </span>
                  <span className="scoreboard text-3xl sm:text-5xl text-[color:var(--color-ink-50)] tabular-nums">
                    {predAway}
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="font-mono text-[0.55rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-500)]">
                  Match
                </span>
                <span className="font-display text-3xl sm:text-4xl tracking-[0.08em] text-[color:var(--color-ink-500)] leading-none">
                  VS
                </span>
              </>
            )}
          </div>

          {/* AWAY */}
          <div className="flex items-center gap-3 justify-end flex-row-reverse min-w-0">
            <TeamCrest
              name={fixture.awayTeam.name}
              logoUrl={fixture.awayTeam.logoUrl}
            />
            <div className="min-w-0 text-right">
              <p className="font-mono text-[0.55rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] mb-1">
                Away
              </p>
              <h3 className="font-display text-lg sm:text-2xl tracking-wide text-[color:var(--color-ink-50)] truncate leading-none">
                {fixture.awayTeam.name}
              </h3>
            </div>
          </div>
        </div>

        {/* Settled: full points ledger. Otherwise: plain pick list. */}
        {isFinal && p?.breakdown ? (
          <div className="mt-5">
            <PointsBreakdown breakdown={p.breakdown} />
          </div>
        ) : (
          hasPrediction &&
          p &&
          (p.scorers.length > 0 || p.assisters.length > 0) && (
            <div className="mt-5 pt-4 border-t border-dashed border-[color:var(--color-ink-700)] space-y-1.5">
              {p.scorers.length > 0 && (
                <p className="text-xs text-[color:var(--color-ink-200)] leading-relaxed">
                  <span className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] mr-2">
                    Scorers
                  </span>
                  <span className="text-[color:var(--color-ink-100)]">
                    {formatPicks(p.scorers, nameById)}
                  </span>
                </p>
              )}
              {p.assisters.length > 0 && (
                <p className="text-xs text-[color:var(--color-ink-200)] leading-relaxed">
                  <span className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] mr-2">
                    Assisters
                  </span>
                  <span className="text-[color:var(--color-ink-100)]">
                    {formatPicks(p.assisters, nameById)}
                  </span>
                </p>
              )}
            </div>
          )
        )}
      </div>

      <div className="tick-divider mx-4 sm:mx-6" />

      {/* Footer */}
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {chip ? (
            <span className={chip.className}>{chip.label}</span>
          ) : (
            <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)] italic">
              No prediction yet
            </span>
          )}
          {hasPrediction && hasScore && (
            <span className="chip">
              <span className="font-mono tabular-nums text-[color:var(--color-ink-50)]">
                {predHome}–{predAway}
              </span>
            </span>
          )}
          {points != null && (
            <span className={points > 0 ? 'chip chip-win' : 'chip'}>
              <span className="font-mono tabular-nums">
                {points > 0 ? `+${points}` : points} pts
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Reveal everyone's picks — unlocks the moment the fixture locks. */}
          <Button
            size="sm"
            variant="outline"
            onClick={onReveal}
            disabled={!locked}
            icon={
              locked ? (
                <Eye className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )
            }
          >
            {locked ? 'See picks' : 'Picks at lock'}
          </Button>
          {!isFinal && !locked && (
            <Button
              size="sm"
              variant={hasPrediction ? 'outline' : 'primary'}
              onClick={onEdit}
              icon={<Pencil className="w-4 h-4" />}
            >
              {hasPrediction ? 'Edit' : 'Predict'}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
