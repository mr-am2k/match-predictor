import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getLeagueMembers } from '../../api/leagues';
import type { LeagueMember } from '../../types/league';

interface MemberListProps {
  leagueId: string;
}

function formatJoinedDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function MemberList({ leagueId }: MemberListProps) {
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getLeagueMembers(leagueId)
      .then((data) => {
        if (cancelled) return;
        setMembers(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load members');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  if (isLoading) {
    return (
      <div className="py-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (members.length === 0) {
    return <p className="text-sm text-gray-500">No members yet.</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {members.map((member) => (
        <li
          key={member.userId}
          className="py-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-indigo-600">
                {member.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{member.username}</div>
              <div className="text-xs text-gray-500">
                Joined {formatJoinedDate(member.joinedAt)}
              </div>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
              member.role === 'OWNER'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {member.role}
          </span>
        </li>
      ))}
    </ul>
  );
}
