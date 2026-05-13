import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { joinPublicLeague } from '../../api/leagues';
import type { LeagueBrowseItem } from '../../types/league';

function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = then - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (absSec < 60) return rtf.format(diffSec, 'second');
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (absSec < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (absSec < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
  return rtf.format(Math.round(diffSec / 31536000), 'year');
}

interface LeagueBrowseCardProps {
  league: LeagueBrowseItem;
  onJoined: () => void;
}

export function LeagueBrowseCard({ league, onJoined }: LeagueBrowseCardProps) {
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJoinedToast, setShowJoinedToast] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);
    try {
      await joinPublicLeague(league.id);
      setShowJoinedToast(true);
      window.setTimeout(() => setShowJoinedToast(false), 2000);
      onJoined();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="group relative flex flex-col h-full rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/80 backdrop-blur-[6px] overflow-hidden transition-all duration-300 hover:border-[color:var(--color-ink-500)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(215,255,61,0.08)]">
      {/* Header strip with competition */}
      <div className="relative flex items-center gap-3 px-5 pt-5">
        {league.competition.logoUrl ? (
          <img
            src={league.competition.logoUrl}
            alt=""
            className="w-10 h-10 object-contain flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.6rem] tracking-[0.26em] uppercase text-[color:var(--color-ink-300)] truncate">
            {league.competition.name}
          </p>
          <p className="font-mono tabular-nums text-xs text-[color:var(--color-volt-200)]">
            Season {league.seasonYear}
          </p>
        </div>
        {league.joined && (
          <span className="chip chip-win flex-shrink-0">
            <Check className="w-3 h-3" strokeWidth={3} />
            Joined
          </span>
        )}
      </div>

      <div className="px-5 pt-4">
        <h3 className="font-display text-2xl sm:text-[1.6rem] tracking-wide uppercase text-[color:var(--color-ink-50)] leading-[0.95] line-clamp-2">
          {league.name}
        </h3>
      </div>

      <div className="px-5 py-4 mt-auto space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
            By <span className="text-[color:var(--color-ink-100)] normal-case tracking-normal font-sans font-semibold">{league.owner.username}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[color:var(--color-ink-300)]">
            <Users className="w-3.5 h-3.5" />
            {league.memberCount}
          </span>
        </div>

        <div className="tick-divider" />

        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[0.6rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-400)]">
            {formatRelativeTime(league.createdAt)}
          </span>
          {league.joined ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/leagues/${league.id}`)}
              icon={<ArrowRight />}
              iconPosition="right"
            >
              Open
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleJoin}
              isLoading={isJoining}
              icon={<ArrowRight />}
              iconPosition="right"
            >
              Join
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-[color:var(--color-loss-500)]">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {showJoinedToast && (
          <div className="flex items-center gap-2 text-xs text-[color:var(--color-win-500)] font-mono tracking-[0.18em] uppercase">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Locked in</span>
          </div>
        )}
      </div>

      {/* Bottom accent line on hover */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[color:var(--color-volt-200)] transition-all duration-500 group-hover:w-full" />
    </div>
  );
}
