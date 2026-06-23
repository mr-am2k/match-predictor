package byteblaze.backend.overall.service;

/**
 * Computes the season-long ("overall") prediction scores for a competition+season:
 * the actual winner, top scorer(s) and top assister(s), then each active league's
 * overall predictions against them.
 *
 * <p>Extracted from {@code SeasonSettledListener} so the same logic can be driven
 * both automatically (when the final fixture settles) and manually (when an admin
 * corrects a result in an already-finished season).</p>
 */
public interface OverallSeasonScoringService {

    /**
     * Score every active league's overall predictions for the competition+season.
     *
     * @param force when {@code true}, existing {@code league_overall_scores} rows
     *              for those leagues are deleted first and the idempotency guard
     *              is bypassed — i.e. a full recalculation. When {@code false},
     *              already-scored predictions are skipped.
     */
    void scoreSeason(Long competitionId, Integer season, boolean force);
}
