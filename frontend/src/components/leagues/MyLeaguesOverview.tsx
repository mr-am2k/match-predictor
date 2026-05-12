import { AlertCircle, Globe, Lock, Plus, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyLeagues } from '../../api/leagues';
import type { LeagueSummary } from '../../types/league';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';

export function MyLeaguesOverview() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMyLeagues()
      .then((data) => {
        if (cancelled) return;
        setLeagues(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load leagues');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Your leagues</h2>
          <Link to="/leagues/new">
            <Button size="sm" icon={<Plus className="w-4 h-4" />}>
              New league
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && isLoading && (
          <div className="py-8 text-center text-sm text-gray-500">Loading your leagues...</div>
        )}

        {!error && !isLoading && leagues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues yet</h3>
            <p className="text-gray-600 max-w-sm mb-6">
              Create your first prediction league and invite friends to compete.
            </p>
            <Link to="/leagues/new">
              <Button icon={<Plus className="w-4 h-4" />}>Create your first league</Button>
            </Link>
          </div>
        )}

        {!error && !isLoading && leagues.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {leagues.map((league) => (
              <li key={league.id}>
                <Link
                  to={`/leagues/${league.id}`}
                  className="flex items-center gap-4 p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
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
                    <div className="font-semibold text-gray-900 truncate">{league.name}</div>
                    <div className="text-sm text-gray-600 truncate">
                      {league.competition.name} · Season {league.competition.seasonYear}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                      {league.visibility === 'PRIVATE' ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Globe className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      {league.memberCount}
                    </span>
                    {league.role === 'OWNER' && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                        Owner
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
