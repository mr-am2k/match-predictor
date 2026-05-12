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
 * Tier 1: live-match polling. Runs every 15 minutes; only spends a call on a
 * competition if there's an active match window (fixture in progress or
 * kicking off within 15 minutes).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "sync.scheduler.enabled", havingValue = "true", matchIfMissing = true)
class LiveWindowTask {

    private final SyncOrchestrator orchestrator;
    private final FixtureSyncService fixtureSyncService;

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT1M")
    void run() {
        List<Competition> competitions = orchestrator.activeCompetitions();
        log.info("LiveWindowTask: tick, active competitions={}", competitions.size());
        for (Competition c : competitions) {
            try {
                if (orchestrator.hasActiveMatchWindow(c)) {
                    fixtureSyncService.syncLiveAndRecent(c);
                } else {
                    log.debug("LiveWindowTask: competition={} has no active match window; skipping", c.getId());
                }
            } catch (Exception e) {
                log.error("LiveWindowTask: competition={} failed: {}", c.getId(), e.getMessage(), e);
            }
        }
    }
}
