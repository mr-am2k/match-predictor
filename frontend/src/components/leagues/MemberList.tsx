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
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[color:var(--color-volt-200)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-ink-300)]">No members yet.</p>
    );
  }

  return (
    <ul className="space-y-1.5 stagger">
      {members.map((member, idx) => (
        <li
          key={member.userId}
          className="group flex items-center justify-between gap-3 p-3 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/60 hover:bg-[color:var(--color-ink-800)] hover:border-[color:var(--color-ink-600)] transition-colors"
        >
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[color:var(--color-volt-200)] to-[color:var(--color-volt-300)] text-[color:var(--color-ink-950)] grid place-items-center flex-shrink-0 font-bold text-sm">
              {member.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-[color:var(--color-ink-50)] truncate">
                {member.username}
              </div>
              <div className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)] mt-0.5">
                Joined {formatJoinedDate(member.joinedAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-mono tabular-nums text-xs text-[color:var(--color-ink-400)] hidden sm:inline">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span
              className={`chip ${member.role === 'OWNER' ? 'chip-volt' : ''}`}
            >
              {member.role}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
