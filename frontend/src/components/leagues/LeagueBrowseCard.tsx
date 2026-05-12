import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
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
    <Card hover className="flex flex-col h-full">
      <CardContent className="flex flex-col flex-1 py-5 space-y-4">
        <div className="flex items-start gap-3">
          {league.competition.logoUrl ? (
            <img
              src={league.competition.logoUrl}
              alt=""
              className="w-10 h-10 object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate">{league.name}</h3>
            <div className="text-sm text-gray-600 truncate">
              {league.competition.name} · Season {league.seasonYear}
            </div>
          </div>
          {league.joined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
              <Check className="w-3 h-3" /> Joined
            </span>
          )}
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <div>
            By <span className="font-medium text-gray-900">{league.owner.username}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users className="w-4 h-4" />
              {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'}
            </span>
            <span className="text-gray-400">·</span>
            <span>Created {formatRelativeTime(league.createdAt)}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {showJoinedToast && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>Joined!</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-end pt-2">
          {league.joined ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/leagues/${league.id}`)}
            >
              Open
            </Button>
          ) : (
            <Button size="sm" onClick={handleJoin} isLoading={isJoining}>
              Join
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
