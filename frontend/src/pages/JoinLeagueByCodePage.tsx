import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { joinLeagueByCode } from '../api/leagues';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import type { League } from '../types/league';

export function JoinLeagueByCodePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [league, setLeague] = useState<League | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setError('No join code provided.');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    joinLeagueByCode(code)
      .then((data) => {
        if (cancelled) return;
        setLeague(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to join league');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <span>Joining league...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        {error || !league ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <h1 className="text-lg font-semibold">Could not join league</h1>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {error ?? 'The join code may be invalid or expired.'}
              </p>
              <Link to="/dashboard">
                <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
                  Back to dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5 flex-shrink-0" />
                <h1 className="text-lg font-semibold">You're in!</h1>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                You joined{' '}
                <span className="font-semibold text-gray-900">"{league.name}"</span>.
              </p>
              <div className="flex items-center gap-3">
                {league.competition.logoUrl && (
                  <img
                    src={league.competition.logoUrl}
                    alt=""
                    className="w-8 h-8 object-contain"
                  />
                )}
                <div className="text-sm text-gray-600">
                  {league.competition.name} · Season {league.competition.seasonYear}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={() => navigate(`/leagues/${league.id}`)}>
                  Go to league
                </Button>
                <Link to="/dashboard">
                  <Button variant="outline">Back to dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
