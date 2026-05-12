package byteblaze.backend.sync.orchestrator;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.fixture.service.FixtureSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Tier 2: upcoming fixtures refresh. Every 6 hours. 1 call per competition to
 * pick up rescheduled kickoffs etc.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "sync.scheduler.enabled", havingValue = "true", matchIfMissing = true)
class UpcomingFixturesTask {

    private final SyncOrchestrator orchestrator;
    private final FixtureSyncService fixtureSyncService;

    @Scheduled(fixedDelayString = "PT6H", initialDelayString = "PT5M")
    void run() {
        List<Competition> competitions = orchestrator.activeCompetitions();
        log.info("UpcomingFixturesTask: tick, active competitions={}", competitions.size());
        for (Competition c : competitions) {
            try {
                fixtureSyncService.syncUpcoming(c);
            } catch (Exception e) {
                log.error("UpcomingFixturesTask: competition={} failed: {}", c.getId(), e.getMessage(), e);
            }
        }
    }
}
