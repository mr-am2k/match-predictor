package byteblaze.backend.sync.orchestrator;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.league.event.LeagueCreatedEvent;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;

/**
 * Fires after a league is created (and the creating transaction has committed)
 * and kicks off a one-shot bootstrap sync for the competition if its data is
 * stale or missing. Runs asynchronously so the user's league-creation request
 * returns immediately; bootstrap failures are logged and swallowed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BootstrapSyncListener {

    private static final long STALE_AFTER_HOURS = 6;

    private final SyncOrchestrator orchestrator;
    private final CompetitionRepository competitionRepo;
    private final FixtureRepository fixtureRepo;

    @PostConstruct
    void logRegistered() {
        log.info("BootstrapSyncListener bean created and registered");
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeagueCreated(LeagueCreatedEvent event) {
        log.info("BootstrapSyncListener.onLeagueCreated received event for leagueId={} competitionId={}",
                event.leagueId(), event.competitionId());

        Competition competition = competitionRepo.findById(event.competitionId())
                .orElse(null);
        if (competition == null) {
            log.warn("Bootstrap: competition {} not found", event.competitionId());
            return;
        }

        boolean needsBootstrap =
                fixtureRepo.findAllByCompetitionIdAndSeasonYear(competition.getId(), competition.getSeasonYear()).isEmpty()
                        || isStale(competition.getLastSyncedAt());

        if (!needsBootstrap) {
            log.info("Bootstrap: competition {} already fresh, skipping", competition.getId());
            return;
        }

        log.info("Bootstrap: running one-shot sync for competition {}", competition.getId());
        try {
            orchestrator.bootstrapCompetition(competition);
        } catch (Exception ex) {
            log.error("Bootstrap failed for competition {}", competition.getId(), ex);
        }
    }

    private boolean isStale(LocalDateTime lastSyncedAt) {
        return lastSyncedAt == null || lastSyncedAt.isBefore(LocalDateTime.now().minusHours(STALE_AFTER_HOURS));
    }
}
