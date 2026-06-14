package byteblaze.backend.sync.orchestrator;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.fixture.entity.FixtureStatus;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.fixture.service.FixtureSyncService;
import byteblaze.backend.player.service.PlayerSyncService;
import byteblaze.backend.team.service.TeamSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Glue between the scheduled tasks and the per-entity sync services. Owns the
 * "which competitions are we syncing right now" logic and the one-shot
 * bootstrap sequence used by the league-creation listener.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SyncOrchestrator {

    private static final Set<FixtureStatus> UNFINISHED_STATUSES;

    static {
        EnumSet<FixtureStatus> unfinished = EnumSet.allOf(FixtureStatus.class);
        unfinished.removeAll(FixtureStatus.FINAL);
        unfinished.removeAll(FixtureStatus.CANCELLED);
        UNFINISHED_STATUSES = unfinished;
    }

    private final CompetitionRepository competitionRepository;
    private final FixtureRepository fixtureRepository;
    private final FixtureSyncService fixtureSyncService;
    private final TeamSyncService teamSyncService;
    private final PlayerSyncService playerSyncService;

    /**
     * Competitions flagged active that have at least one league attached.
     */
    public List<Competition> activeCompetitions() {
        return competitionRepository.findActiveWithLeagues();
    }

    /**
     * True if this competition has a match we should be polling right now —
     * either an unfinished fixture kicking off within [now-4h, now+15min], or
     * a fixture our DB already shows as in-play.
     *
     * The in-play check matters for long matches: a fixture that goes to extra
     * time + penalties (or suffers a long delay) can still be underway after the
     * 4h kickoff window closes. Once we've recorded it as in-play we keep polling
     * until it actually reaches a FINAL/CANCELLED state, so its result never gets
     * stranded.
     */
    boolean hasActiveMatchWindow(Competition c) {
        OffsetDateTime from = OffsetDateTime.now().minusHours(4);
        OffsetDateTime to = OffsetDateTime.now().plusMinutes(15);
        long upcomingOrRecent = fixtureRepository.countInWindow(c.getId(), UNFINISHED_STATUSES, from, to);
        if (upcomingOrRecent > 0) {
            return true;
        }
        return fixtureRepository.countByCompetitionIdAndStatusIn(c.getId(), FixtureStatus.IN_PLAY) > 0;
    }

    /**
     * On-demand refresh of a competition's live/recent and upcoming fixtures.
     * Backs the league owner's "sync match data" button. Lighter than a full
     * {@link #bootstrapCompetition} (no teams/squads); just pulls fixture state
     * and settles anything that has finished. Each sub-call is budget-gated, so
     * an exhausted budget degrades to a no-op rather than an error.
     */
    public void refreshFixturesNow(Competition c) {
        log.info("On-demand fixture refresh for competition={} ({})", c.getId(), c.getName());
        try {
            fixtureSyncService.syncLiveAndRecent(c);
        } catch (Exception e) {
            log.error("refresh: live+recent failed for competition={}: {}", c.getId(), e.getMessage(), e);
        }
        try {
            fixtureSyncService.syncUpcoming(c);
        } catch (Exception e) {
            log.error("refresh: upcoming failed for competition={}: {}", c.getId(), e.getMessage(), e);
        }
    }

    /**
     * One-shot bootstrap sequence triggered when a new league is created on a
     * competition we haven't recently synced. Intentionally sequential:
     * teams first (so fixtures can reference known team ids), then fixtures,
     * then squads for the teams we now know about.
     */
    public void bootstrapCompetition(Competition c) {
        log.info("Bootstrap sync starting for competition={} ({})", c.getId(), c.getName());
        try {
            teamSyncService.syncTeams(c);
        } catch (Exception e) {
            log.error("bootstrap: teams sync failed for competition={}: {}", c.getId(), e.getMessage(), e);
        }
        try {
            fixtureSyncService.syncUpcoming(c);
        } catch (Exception e) {
            log.error("bootstrap: upcoming fixtures failed for competition={}: {}", c.getId(), e.getMessage(), e);
        }
        try {
            playerSyncService.syncSquadsForCompetition(c);
        } catch (Exception e) {
            log.error("bootstrap: squads sync failed for competition={}: {}", c.getId(), e.getMessage(), e);
        }
        log.info("Bootstrap sync finished for competition={}", c.getId());
    }
}
