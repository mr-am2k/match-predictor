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
  RefreshCw,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { buildJoinUrl, getLeague, triggerLeagueSync } from '../api/leagues';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { MemberList } from '../components/leagues/MemberList';
import { ScoringRulesCard } from '../components/leagues/ScoringRulesCard';
import { SeasonPicksPanel } from '../components/leagues/SeasonPicksPanel';
import { StandingsTable } from '../components/leagues/StandingsTable';
import { useAuth } from '../context/AuthContext';
import type { League } from '../types/league';

type TabKey = 'overview' | 'season-picks' | 'standings';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Trophy }> = [
  { key: 'overview', label: 'Overview', icon: ListChecks },
  { key: 'season-picks', label: 'Season picks', icon: Star },
  { key: 'standings', label: 'Standings', icon: Trophy },
];

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
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

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

  const handleSync = async () => {
    if (!id || syncing) return;
    setSyncing(true);
    setSyncNotice(null);
    try {
      const result = await triggerLeagueSync(id);
      setSyncNotice({
        tone: result.triggered ? 'ok' : 'warn',
        text: `${result.message} (${result.usedLast24h}/${result.dailyLimit} calls today)`,
      });
    } catch (err) {
      setSyncNotice({
        tone: 'warn',
        text: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      setSyncing(false);
      window.setTimeout(() => setSyncNotice(null), 6000);
    }
  };

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
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[color:var(--color-volt-200)] animate-spin" />
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-[calc(100vh-72px)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-14 space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error ?? 'League not found'}</span>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" icon={<ArrowLeft />}>
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user !== null && league.owner.id === user.id;
  const joinUrl = league.joinCode ? buildJoinUrl(league.joinCode) : null;

  return (
    <div className="min-h-[calc(100vh-72px)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14 space-y-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>

        {justCreated && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[color:var(--color-win-500)]/40 bg-[color:var(--color-win-500)]/8 text-[color:var(--color-win-500)] text-sm animate-fade-up">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>League created successfully. Invite the rivals.</span>
          </div>
        )}

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/80 backdrop-blur-[6px] animate-fade-up">
          <div aria-hidden className="absolute inset-0 stadium-mesh opacity-50 [mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_70%)]" />
          <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[color:var(--color-volt-200)]/12 blur-3xl" />
          <div className="relative p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <span className={`chip ${league.visibility === 'PRIVATE' ? '' : 'chip-win'}`}>
                {league.visibility === 'PRIVATE' ? (
                  <>
                    <Lock className="w-3 h-3" /> Private
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3" /> Public
                  </>
                )}
              </span>
              {isOwner && <span className="chip chip-volt">Owner</span>}
              <span className="font-mono text-[0.62rem] tracking-[0.24em] uppercase text-[color:var(--color-ink-400)] inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span className="tabular-nums text-[color:var(--color-ink-200)]">{league.memberCount}</span>
                {league.memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-8">
                <p className="font-mono text-[0.68rem] tracking-[0.28em] uppercase text-[color:var(--color-volt-200)] mb-3">
                  / League
                </p>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9] break-words">
                  {league.name}
                </h1>
                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  {league.competition.logoUrl && (
                    <img
                      src={league.competition.logoUrl}
                      alt=""
                      className="w-10 h-10 object-contain"
                    />
                  )}
                  <div>
                    <div className="font-display text-lg tracking-wide uppercase text-[color:var(--color-ink-50)]">
                      {league.competition.name}
                    </div>
                    <div className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mt-0.5">
                      Season {league.competition.seasonYear}
                      {league.competition.countryName ? ` · ${league.competition.countryName}` : ''}
                    </div>
                  </div>
                </div>
                <p className="mt-5 text-sm text-[color:var(--color-ink-200)]">
                  Owned by{' '}
                  <span className="font-semibold text-[color:var(--color-ink-50)]">
                    {league.owner.username}
                  </span>
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
                <Button
                  onClick={() => navigate(`/leagues/${league.id}/predictions`)}
                  icon={<ListChecks />}
                  iconPosition="right"
                  size="lg"
                  className="w-full justify-between"
                >
                  View predictions
                </Button>
                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={handleSync}
                    disabled={syncing}
                    icon={<RefreshCw className={syncing ? 'animate-spin' : undefined} />}
                    className="w-full justify-center"
                    title="Pull the latest live, finished and upcoming match data for this competition"
                  >
                    {syncing ? 'Syncing…' : 'Sync match data'}
                  </Button>
                )}
                {syncNotice && (
                  <p
                    className={`font-mono text-[0.62rem] tracking-[0.12em] leading-relaxed text-center ${
                      syncNotice.tone === 'ok'
                        ? 'text-[color:var(--color-win-500)]'
                        : 'text-[color:var(--color-ink-300)]'
                    }`}
                  >
                    {syncNotice.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="border-b border-[color:var(--color-ink-700)] -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 overflow-x-auto">
          <nav className="flex gap-1 sm:gap-2 min-w-max" aria-label="Tabs">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`relative inline-flex items-center gap-2 py-3 px-4 font-mono text-[0.7rem] tracking-[0.22em] uppercase transition-colors ${
                    isActive
                      ? 'text-[color:var(--color-volt-200)]'
                      : 'text-[color:var(--color-ink-300)] hover:text-[color:var(--color-ink-50)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span
                    className={`absolute left-0 right-0 -bottom-px h-[2px] transition-all ${
                      isActive ? 'bg-[color:var(--color-volt-200)]' : 'bg-transparent'
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {isOwner && league.visibility === 'PRIVATE' && league.joinCode && joinUrl && (
              <Card>
                <CardHeader>
                  <p className="font-mono text-[0.62rem] tracking-[0.25em] uppercase text-[color:var(--color-volt-200)] mb-2">
                    / Invite
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
                    Invite the rivals
                  </h2>
                  <p className="text-sm text-[color:var(--color-ink-200)] mt-1">
                    Share this link or code with the people you want to invite. Only league owners can see it.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mb-2">
                      Join link
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2.5 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/70 font-mono text-xs text-[color:var(--color-ink-100)] break-all">
                        {joinUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(joinUrl, 'url')}
                        icon={copiedTarget === 'url' ? <Check /> : <Copy />}
                      >
                        {copiedTarget === 'url' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mb-2">
                      Join code
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-3 rounded-lg border border-[color:var(--color-volt-200)]/30 bg-[color:var(--color-volt-200)]/5 font-mono text-lg font-bold text-[color:var(--color-volt-200)] tracking-[0.3em] text-center">
                        {league.joinCode}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(league.joinCode!, 'code')}
                        icon={copiedTarget === 'code' ? <Check /> : <Copy />}
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
                    <p className="font-mono text-[0.62rem] tracking-[0.25em] uppercase text-[color:var(--color-volt-200)] mb-2">
                      / Roster
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
                      Members
                    </h2>
                    <p className="text-sm text-[color:var(--color-ink-200)] mt-1">
                      <span className="font-mono tabular-nums text-[color:var(--color-ink-100)]">{league.memberCount}</span>{' '}
                      {league.memberCount === 1 ? 'manager' : 'managers'} in this league
                    </p>
                  </div>
                  <span className="w-9 h-9 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)]/60 grid place-items-center text-[color:var(--color-ink-300)] flex-shrink-0">
                    {membersExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </button>
              </CardHeader>
              {membersExpanded && (
                <CardContent>
                  <MemberList leagueId={league.id} />
                </CardContent>
              )}
            </Card>

            <ScoringRulesCard league={league} />
          </div>
        )}

        {activeTab === 'season-picks' && (
          <div className="animate-fade-in">
            <SeasonPicksPanel leagueId={league.id} />
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="animate-fade-in">
            <Card>
              <CardHeader>
                <p className="font-mono text-[0.62rem] tracking-[0.25em] uppercase text-[color:var(--color-volt-200)] mb-2">
                  / Leaderboard
                </p>
                <h2 className="font-display text-2xl sm:text-3xl tracking-wide uppercase text-[color:var(--color-ink-50)]">
                  Standings
                </h2>
                <p className="text-sm text-[color:var(--color-ink-200)] mt-1">
                  Total points across settled gameweeks.
                </p>
              </CardHeader>
              <CardContent>
                <StandingsTable leagueId={league.id} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
