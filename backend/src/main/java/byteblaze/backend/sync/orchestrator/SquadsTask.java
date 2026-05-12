package byteblaze.backend.sync.orchestrator;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.player.service.PlayerSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Tier 4: weekly squad refresh, Sunday 02:00 UTC. Heaviest job: one call per
 * team per competition. Budget-aware — stops mid-loop rather than surfacing
 * errors.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "sync.scheduler.enabled", havingValue = "true", matchIfMissing = true)
class SquadsTask {

    private final SyncOrchestrator orchestrator;
    private final PlayerSyncService playerSyncService;

    @Scheduled(cron = "0 0 2 * * SUN")
    void run() {
        List<Competition> competitions = orchestrator.activeCompetitions();
        log.info("SquadsTask: tick, active competitions={}", competitions.size());
        for (Competition c : competitions) {
            try {
                playerSyncService.syncSquadsForCompetition(c);
            } catch (Exception e) {
                log.error("SquadsTask: competition={} failed: {}", c.getId(), e.getMessage(), e);
            }
        }
    }
}
