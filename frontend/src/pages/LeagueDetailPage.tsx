import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  ListChecks,
  Loader2,
  Lock,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { buildJoinUrl, getLeague } from '../api/leagues';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { MemberList } from '../components/leagues/MemberList';
import { ScoringRulesCard } from '../components/leagues/ScoringRulesCard';
import { SeasonPicksPanel } from '../components/leagues/SeasonPicksPanel';
import { StandingsTable } from '../components/leagues/StandingsTable';
import { useAuth } from '../context/AuthContext';
import type { League } from '../types/league';

type TabKey = 'overview' | 'season-picks' | 'standings';

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const justCreated = Boolean(
    (location.state as { justCreated?: boolean } | null)?.justCreated
  );

  const [league, setLeague] = useState<League | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedTarget, setCopiedTarget] = useState<'code' | 'url' | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [membersExpanded, setMembersExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getLeague(id)
      .then((data) => {
        if (cancelled) return;
        setLeague(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load league');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCopy = async (value: string, target: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 2000);
    } catch {
      // Clipboard API can fail in some browsers / contexts; fail silently.
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error ?? 'League not found'}</span>
          </div>
          <div className="mt-4">
            <Link to="/dashboard">
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user !== null && league.owner.id === user.id;
  const joinUrl = league.joinCode ? buildJoinUrl(league.joinCode) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {justCreated && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>League created successfully.</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 break-words">{league.name}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  {league.visibility === 'PRIVATE' ? (
                    <>
                      <Lock className="w-4 h-4" /> Private league
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" /> Public league
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>
                  {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {league.competition.logoUrl && (
                <img src={league.competition.logoUrl} alt="" className="w-10 h-10 object-contain" />
              )}
              <div>
                <div className="font-semibold text-gray-900">{league.competition.name}</div>
                <div className="text-sm text-gray-600">
                  Season {league.competition.seasonYear}
                  {league.competition.countryName ? ` · ${league.competition.countryName}` : ''}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Owned by <span className="font-medium text-gray-900">{league.owner.username}</span>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => navigate(`/leagues/${league.id}/predictions`)}
                icon={<ListChecks className="w-4 h-4" />}
              >
                View predictions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('season-picks')}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'season-picks'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Star className="w-4 h-4" />
              Season picks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('standings')}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'standings'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Standings
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <>
            {isOwner && league.visibility === 'PRIVATE' && league.joinCode && joinUrl && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Invite friends</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Share this link or code with the people you want to invite. Only league owners can see it.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Join link</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 break-all">
                        {joinUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(joinUrl, 'url')}
                        icon={
                          copiedTarget === 'url' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )
                        }
                      >
                        {copiedTarget === 'url' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Join code</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-lg font-mono font-semibold text-gray-900 tracking-wider">
                        {league.joinCode}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(league.joinCode!, 'code')}
                        icon={
                          copiedTarget === 'code' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )
                        }
                      >
                        {copiedTarget === 'code' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <button
                  type="button"
                  onClick={() => setMembersExpanded((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Members</h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'} in this league
                    </p>
                  </div>
                  {membersExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </CardHeader>
              {membersExpanded && (
                <CardContent>
                  <MemberList leagueId={league.id} />
                </CardContent>
              )}
            </Card>

            <ScoringRulesCard league={league} />
          </>
        )}

        {activeTab === 'season-picks' && (
          <SeasonPicksPanel leagueId={league.id} />
        )}

        {activeTab === 'standings' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Standings</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Total points across settled gameweeks.
              </p>
            </CardHeader>
            <CardContent>
              <StandingsTable leagueId={league.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
