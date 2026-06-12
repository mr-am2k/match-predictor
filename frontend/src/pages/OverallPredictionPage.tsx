import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  Save,
  Trophy,
  Target,
  Handshake,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLeague } from '../api/leagues';
import {
  getOverallPrediction,
  listPlayers,
  listTeams,
  OVERALL_LOCKED_MESSAGE,
  upsertOverallPrediction,
} from '../api/overall';
import { LockCountdown } from '../components/predictions/LockCountdown';
import { Button } from '../components/ui/Button';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import type { League } from '../types/league';
import type {
  OverallPrediction,
  UpsertOverallPrediction,
} from '../types/overall';
import type { PlayerSummary, TeamSummary } from '../types/prediction';

function formatLockDate(locksAt: string | null): string {
  if (!locksAt) return '';
  const [year, month, day] = locksAt.split('-').map(Number);
  if (!year || !month || !day) return locksAt;
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function toCountdownIso(locksAt: string | null): string | null {
  if (!locksAt) return null;
  return `${locksAt}T00:00:00Z`;
}

export function OverallPredictionPage() {
  const { id } = useParams<{ id: string }>();

  const [league, setLeague] = useState<League | null>(null);
  const [prediction, setPrediction] = useState<OverallPrediction | null>(null);
  const [teams, setTeams] = useState<TeamSummary[] | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [winnerTeamId, setWinnerTeamId] = useState<number | null>(null);
  const [topScorerPlayerId, setTopScorerPlayerId] = useState<number | null>(null);
  const [topAssisterPlayerId, setTopAssisterPlayerId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [locallyLocked, setLocallyLocked] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      getLeague(id),
      getOverallPrediction(id),
      listTeams(id),
      listPlayers(id),
    ])
      .then(([leagueData, predictionData, teamsData, playersData]) => {
        if (cancelled) return;
        setLeague(leagueData);
        setPrediction(predictionData);
        setTeams(teamsData);
        setPlayers(playersData);
        setWinnerTeamId(predictionData.winnerTeamId);
        setTopScorerPlayerId(predictionData.topScorerPlayerId);
        setTopAssisterPlayerId(predictionData.topAssisterPlayerId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load season picks');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const sortedTeams = useMemo(() => {
    if (!teams) return [];
    return [...teams].sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  const selectedTeam = useMemo(
    () => sortedTeams.find((t) => t.id === winnerTeamId) ?? null,
    [sortedTeams, winnerTeamId]
  );

  const selectedScorer = useMemo(
    () => sortedPlayers.find((p) => p.playerId === topScorerPlayerId) ?? null,
    [sortedPlayers, topScorerPlayerId]
  );

  const selectedAssister = useMemo(
    () => sortedPlayers.find((p) => p.playerId === topAssisterPlayerId) ?? null,
    [sortedPlayers, topAssisterPlayerId]
  );

  const locked = (prediction?.locked ?? false) || locallyLocked;

  const handleSave = useCallback(async () => {
    if (!id || locked) return;
    setSaving(true);
    setSaveError(null);
    setSavedFlash(false);
    const body: UpsertOverallPrediction = {
      winnerTeamId,
      topScorerPlayerId,
      topAssisterPlayerId,
    };
    try {
      const updated = await upsertOverallPrediction(id, body);
      setPrediction(updated);
      setWinnerTeamId(updated.winnerTeamId);
      setTopScorerPlayerId(updated.topScorerPlayerId);
      setTopAssisterPlayerId(updated.topAssisterPlayerId);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save picks';
      setSaveError(message);
      if (message === OVERALL_LOCKED_MESSAGE) {
        setLocallyLocked(true);
      }
    } finally {
      setSaving(false);
    }
  }, [id, locked, winnerTeamId, topScorerPlayerId, topAssisterPlayerId]);

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-[color:var(--color-volt-200)] animate-spin" />
        <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-ink-300)]">
          Loading season picks…
        </p>
      </div>
    );
  }

  if (loadError || !league || !prediction) {
    return (
      <div className="min-h-[calc(100vh-72px)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-2.5 p-4 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{loadError ?? 'Season picks unavailable'}</span>
          </div>
          <div className="mt-5">
            <Link to={`/leagues/${id}`}>
              <Button variant="outline" icon={<ArrowLeft />}>
                Back to league
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const emptyTeams = sortedTeams.length === 0;
  const emptyPlayers = sortedPlayers.length === 0;
  const countdownIso = toCountdownIso(prediction.locksAt);
  const showCountdown = !locked && countdownIso !== null;

  return (
    <div className="min-h-[calc(100vh-72px)] relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 stadium-mesh opacity-40 pointer-events-none" />

      <div className="relative max-w-[72rem] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <Link
          to={`/leagues/${id}`}
          className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] hover:text-[color:var(--color-volt-200)] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to league
        </Link>

        <div className="animate-fade-up">
          <p className="font-mono text-[0.7rem] tracking-[0.3em] uppercase text-[color:var(--color-volt-200)] mb-3">
            / Season long · Big calls
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-wide text-[color:var(--color-ink-50)] leading-[0.9]">
            Season picks.
          </h1>
          <p className="mt-4 text-[color:var(--color-ink-200)] max-w-2xl text-base">
            Call the champion, the golden boot and the top playmaker for{' '}
            <span className="text-[color:var(--color-ink-50)] font-semibold">{league.name}</span>
            . One shot, one season — bonus points for nailing it.
          </p>
          <p className="mt-2 font-mono text-[0.7rem] tracking-[0.18em] uppercase text-[color:var(--color-ink-300)]">
            {league.competition.name} · Season {league.competition.seasonYear}
          </p>
        </div>

        {/* Lock status */}
        <div className="mt-8">
          {showCountdown && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/80">
              <div>
                <p className="font-mono text-[0.6rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)]">
                  Lock deadline
                </p>
                <p className="text-sm text-[color:var(--color-ink-100)] mt-1">
                  Picks lock 3 days after the season starts
                  {prediction.locksAt ? ` (${formatLockDate(prediction.locksAt)})` : ''}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LockCountdown locksAt={countdownIso!} />
              </div>
            </div>
          )}

          {locked && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)]">
              <Lock className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-display text-xl tracking-wide">PICKS LOCKED</p>
                <p className="text-sm mt-1 text-[color:var(--color-loss-500)]/90">
                  Closed 3 days after the season started
                  {prediction.locksAt ? ` on ${formatLockDate(prediction.locksAt)}` : ''}.
                  They'll score when the season ends.
                </p>
              </div>
            </div>
          )}

          {(emptyTeams || emptyPlayers) && (
            <div className="mt-4 p-4 rounded-xl border border-[color:var(--color-draw-500)]/40 bg-[color:var(--color-draw-500)]/8 text-[color:var(--color-draw-500)] text-sm">
              {emptyTeams && emptyPlayers
                ? 'Teams and players for this competition haven’t been synced yet. Check back shortly.'
                : emptyTeams
                  ? 'Teams for this competition haven’t been synced yet. Check back shortly.'
                  : 'Players for this competition haven’t been synced yet. Check back shortly.'}
            </div>
          )}
        </div>

        {/* Pick cards grid */}
        <div className="mt-10 grid md:grid-cols-3 gap-4 stagger">
          <PickCard
            kicker="/01 · Winner"
            title="Champion"
            subtitle="Who lifts the trophy?"
            icon={<Trophy className="w-5 h-5" strokeWidth={2} />}
            selection={selectedTeam ? (
              <div className="flex items-center gap-3">
                {selectedTeam.logoUrl && (
                  <img src={selectedTeam.logoUrl} alt="" className="w-8 h-8 object-contain" />
                )}
                <span className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)]">
                  {selectedTeam.name.toUpperCase()}
                </span>
              </div>
            ) : null}
          >
            <SearchableSelect
              disabled={locked || emptyTeams}
              value={winnerTeamId}
              onChange={(val) => setWinnerTeamId(val === '' ? null : Number(val))}
              placeholder="Select a team…"
              searchPlaceholder="Search teams…"
              emptyMessage="No teams match"
              options={sortedTeams.map((t) => ({ value: String(t.id), label: t.name }))}
              onClear={() => setWinnerTeamId(null)}
              canClear={winnerTeamId !== null && !locked}
            />
          </PickCard>

          <PickCard
            kicker="/02 · Goals"
            title="Top scorer"
            subtitle="Who tops the goal charts?"
            icon={<Target className="w-5 h-5" strokeWidth={2} />}
            selection={selectedScorer ? (
              <div>
                <p className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)]">
                  {selectedScorer.name.toUpperCase()}
                </p>
                {selectedScorer.position && (
                  <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mt-1">
                    {selectedScorer.position}
                  </p>
                )}
              </div>
            ) : null}
          >
            <SearchableSelect
              disabled={locked || emptyPlayers}
              value={topScorerPlayerId}
              onChange={(val) => setTopScorerPlayerId(val === '' ? null : Number(val))}
              placeholder="Select a player…"
              searchPlaceholder="Search players…"
              emptyMessage="No players match"
              options={sortedPlayers.map((p) => ({
                value: String(p.playerId),
                label: p.name,
                hint: p.position,
              }))}
              onClear={() => setTopScorerPlayerId(null)}
              canClear={topScorerPlayerId !== null && !locked}
            />
          </PickCard>

          <PickCard
            kicker="/03 · Creator"
            title="Top assister"
            subtitle="Who racks up assists?"
            icon={<Handshake className="w-5 h-5" strokeWidth={2} />}
            selection={selectedAssister ? (
              <div>
                <p className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)]">
                  {selectedAssister.name.toUpperCase()}
                </p>
                {selectedAssister.position && (
                  <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-ink-300)] mt-1">
                    {selectedAssister.position}
                  </p>
                )}
              </div>
            ) : null}
          >
            <SearchableSelect
              disabled={locked || emptyPlayers}
              value={topAssisterPlayerId}
              onChange={(val) => setTopAssisterPlayerId(val === '' ? null : Number(val))}
              placeholder="Select a player…"
              searchPlaceholder="Search players…"
              emptyMessage="No players match"
              options={sortedPlayers.map((p) => ({
                value: String(p.playerId),
                label: p.name,
                hint: p.position,
              }))}
              onClear={() => setTopAssisterPlayerId(null)}
              canClear={topAssisterPlayerId !== null && !locked}
            />
          </PickCard>
        </div>

        {/* Save footer */}
        <div className="mt-8 space-y-3">
          {saveError && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg border border-[color:var(--color-loss-500)]/40 bg-[color:var(--color-loss-500)]/8 text-[color:var(--color-loss-500)] text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          {savedFlash && !saveError && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg border border-[color:var(--color-win-500)]/40 bg-[color:var(--color-win-500)]/8 text-[color:var(--color-win-500)] text-sm">
              <Check className="w-4 h-4 shrink-0" />
              <span>Season picks saved. Good luck.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={locked || saving}
              isLoading={saving}
              icon={<Save />}
            >
              Lock in picks
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PickCardProps {
  kicker: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  selection: ReactNode;
  children: ReactNode;
}

function PickCard({ kicker, title, subtitle, icon, selection, children }: PickCardProps) {
  return (
    <div className="relative rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/80 backdrop-blur overflow-hidden group hover:border-[color:var(--color-volt-200)]/30 transition-colors">
      <div aria-hidden className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-volt-200)]/40 to-transparent" />

      <div className="p-5 sm:p-6 flex items-start justify-between">
        <div>
          <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-[color:var(--color-volt-200)] mb-2">
            {kicker}
          </p>
          <h3 className="font-display text-3xl sm:text-4xl tracking-wide text-[color:var(--color-ink-50)]">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--color-ink-300)]">{subtitle}</p>
        </div>
        <div className="w-10 h-10 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)] grid place-items-center text-[color:var(--color-ink-200)] group-hover:text-[color:var(--color-volt-200)] group-hover:border-[color:var(--color-volt-200)]/40 transition-colors">
          {icon}
        </div>
      </div>

      <div className="px-5 sm:px-6 pb-4">
        <div className="min-h-[56px] rounded-lg border border-dashed border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-900)]/50 p-3 flex items-center">
          {selection ?? (
            <p className="font-mono text-[0.68rem] tracking-[0.2em] uppercase text-[color:var(--color-ink-400)]">
              No selection yet
            </p>
          )}
        </div>
      </div>

      <div className="tick-divider mx-5 sm:mx-6" />

      <div className="p-5 sm:p-6 pt-4">{children}</div>
    </div>
  );
}

