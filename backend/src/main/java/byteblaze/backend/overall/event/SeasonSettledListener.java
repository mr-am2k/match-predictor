package byteblaze.backend.overall.event;

import byteblaze.backend.overall.service.OverallSeasonScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Reacts to {@link SeasonSettledEvent} by scoring every league's overall
 * predictions for the competition+season. The scoring itself lives in
 * {@link OverallSeasonScoringService} so the admin recalculation path can
 * reuse it.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SeasonSettledListener {

    private final OverallSeasonScoringService overallSeasonScoringService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onSeasonSettled(SeasonSettledEvent event) {
        // Automatic path is idempotent: force=false skips already-scored predictions.
        overallSeasonScoringService.scoreSeason(event.competitionId(), event.seasonYear(), false);
    }
}
