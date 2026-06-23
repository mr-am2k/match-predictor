package byteblaze.backend.prediction.event;

import byteblaze.backend.fixture.event.FixtureSettledEvent;
import byteblaze.backend.prediction.service.FixtureScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Drives the scoring engine off the back of a {@link FixtureSettledEvent}.
 *
 * <p>Runs async + after-commit so fixture-sync DB writes are durable before
 * we read them, and so scoring never blocks the sync transaction. The actual
 * scoring lives in {@link FixtureScoringService} so the admin recalculation
 * path can reuse it.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FixtureSettledListener {

    private final FixtureScoringService fixtureScoringService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onFixtureSettled(FixtureSettledEvent event) {
        // Automatic settle path is write-once: force=false skips already-scored
        // predictions and never deletes existing score rows.
        fixtureScoringService.scoreFixture(event.fixtureId(), false);
    }
}
