package byteblaze.backend.sync.orchestrator;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.team.service.TeamSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Tier 3: daily team-metadata refresh at 03:00 UTC. 1 call per competition.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "sync.scheduler.enabled", havingValue = "true", matchIfMissing = true)
class MetadataTask {

    private final SyncOrchestrator orchestrator;
    private final TeamSyncService teamSyncService;

    @Scheduled(cron = "0 0 3 * * *")
    void run() {
        List<Competition> competitions = orchestrator.activeCompetitions();
        log.info("MetadataTask: tick, active competitions={}", competitions.size());
        for (Competition c : competitions) {
            try {
                teamSyncService.syncTeams(c);
            } catch (Exception e) {
                log.error("MetadataTask: competition={} failed: {}", c.getId(), e.getMessage(), e);
            }
        }
    }
}
