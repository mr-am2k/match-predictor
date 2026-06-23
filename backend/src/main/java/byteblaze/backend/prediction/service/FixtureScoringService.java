package byteblaze.backend.prediction.service;

/**
 * Scores every prediction attached to a settled fixture.
 *
 * <p>Extracted from {@code FixtureSettledListener} so the same scoring path can
 * be driven both automatically (when a fixture first goes final) and manually
 * (when an admin corrects a result and points must be recalculated).</p>
 */
public interface FixtureScoringService {

    /**
     * Score all predictions for the given fixture and stamp {@code settled_at}.
     *
     * @param fixtureId the fixture to score
     * @param force     when {@code true}, existing {@code prediction_scores} rows
     *                  for this fixture are deleted first and the per-prediction
     *                  idempotency guard is bypassed — i.e. a full recalculation.
     *                  When {@code false}, already-scored predictions are skipped
     *                  (write-once behaviour for the automatic settle path).
     * @return the number of predictions (re-)scored
     */
    int scoreFixture(Long fixtureId, boolean force);
}
