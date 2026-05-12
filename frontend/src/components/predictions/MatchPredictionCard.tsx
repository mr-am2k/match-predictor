import { Pencil } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '../ui/Button';
import type {
  FixtureWithPrediction,
  PlayerPick,
} from '../../types/prediction';
import { LockCountdown } from './LockCountdown';

interface MatchPredictionCardProps {
  fixture: FixtureWithPrediction;
  onEdit: () => void;
}

const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN']);
const HOUR_MS = 60 * 60 * 1000;

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
      return pick.count > 1 ? `${name} (${pick.count})` : name;
    })
    .join(', ');
}

function summarisePrediction(
  fixture: FixtureWithPrediction,
  nameById: Map<number, string>
): string {
  const prediction = fixture.userPrediction;
  if (!prediction) {
    return 'No prediction yet';
  }

  const headParts: string[] = [];
  if (prediction.predictedDraw) {
    headParts.push('Draw');
  } else if (prediction.winnerTeamId === fixture.homeTeam.id) {
    headParts.push(`${fixture.homeTeam.name} win`);
  } else if (prediction.winnerTeamId === fixture.awayTeam.id) {
    headParts.push(`${fixture.awayTeam.name} win`);
  }

  if (prediction.homeScore !== null && prediction.awayScore !== null) {
    headParts.push(`${prediction.homeScore}-${prediction.awayScore}`);
  }

  const segments: string[] = [];
  if (headParts.length > 0) {
    segments.push(headParts.join(', '));
  }

  if (prediction.scorers.length > 0) {
    segments.push(`Scorers: ${formatPicks(prediction.scorers, nameById)}`);
  }
  if (prediction.assisters.length > 0) {
    segments.push(`Assisters: ${formatPicks(prediction.assisters, nameById)}`);
  }

  if (segments.length === 0) {
    return 'No prediction yet';
  }
  return `You: ${segments.join(' · ')}`;
}

function TeamBadge({
  name,
  logoUrl,
  align,
}: {
  name: string;
  logoUrl: string | null;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={`flex-1 min-w-0 flex items-center gap-2 ${align === 'right' ? 'justify-end flex-row-reverse' : ''}`}
    >
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-8 h-8 object-contain" />
        ) : (
          <span className="text-xs font-bold text-gray-500">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span
        className={`font-semibold text-gray-900 truncate ${align === 'right' ? 'text-right' : 'text-left'}`}
      >
        {name}
      </span>
    </div>
  );
}

export function MatchPredictionCard({
  fixture,
  onEdit,
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
  const summary = summarisePrediction(fixture, nameById);
  const hasPrediction = fixture.userPrediction !== null;
  const locked = fixture.locked;

  // Show the per-fixture countdown only in the final hour before kickoff to avoid clutter.
  const kickoffMs = new Date(fixture.kickoffAt).getTime();
  const nowMs = Date.now();
  const withinCountdownWindow =
    !locked &&
    !isFinal &&
    !Number.isNaN(kickoffMs) &&
    kickoffMs - nowMs <= HOUR_MS;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium text-gray-500">
          {formatKickoff(fixture.kickoffAt)}
        </span>
        {isFinal ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            Final
          </span>
        ) : locked ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
            Locked
          </span>
        ) : withinCountdownWindow ? (
          <LockCountdown
            locksAt={fixture.lockedAt}
            className="text-[10px] font-semibold uppercase tracking-wider"
          />
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {fixture.status}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TeamBadge
          name={fixture.homeTeam.name}
          logoUrl={fixture.homeTeam.logoUrl}
          align="left"
        />
        <div className="flex-shrink-0 text-center min-w-[60px]">
          {showActualScore ? (
            <div className="text-2xl font-bold text-gray-900">
              {fixture.homeScore}-{fixture.awayScore}
            </div>
          ) : (
            <div className="text-gray-400 font-medium text-sm">vs</div>
          )}
        </div>
        <TeamBadge
          name={fixture.awayTeam.name}
          logoUrl={fixture.awayTeam.logoUrl}
          align="right"
        />
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <p
          className={`text-sm flex-1 min-w-0 line-clamp-2 ${hasPrediction ? 'text-gray-700' : 'text-gray-400 italic'}`}
        >
          {summary}
        </p>
        {!isFinal && (
          <Button
            size="sm"
            variant={hasPrediction ? 'outline' : 'primary'}
            onClick={onEdit}
            disabled={locked}
            icon={<Pencil className="w-4 h-4" />}
          >
            {hasPrediction ? 'Edit' : 'Predict'}
          </Button>
        )}
      </div>
    </div>
  );
}
