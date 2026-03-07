package byteblaze.backend.competition;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class CompetitionSyncScheduler {

    private final CompetitionSyncService competitionSyncService;

    @Scheduled(cron = "${competition.sync.cron}")
    public void scheduleSync() {
        log.info("Triggered scheduled competition sync");
        competitionSyncService.sync();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartup() {
        log.info("Triggered startup competition sync");
        competitionSyncService.sync();
    }
}