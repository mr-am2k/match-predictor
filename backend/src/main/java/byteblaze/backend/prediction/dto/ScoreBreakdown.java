package byteblaze.backend.prediction.dto;

import java.util.List;

/**
 * Human-facing view of a settled prediction's points, parsed from
 * {@code prediction_scores.breakdown}. Mirrors the structure written by the
 * scoring engine so the UI can show exactly where points came from and which
 * bonus multiplier was applied.
 *
 * <p>{@code total = round(baseTotal * multiplier)}, where {@code baseTotal} is
 * the sum of {@code winnerPoints + scorePoints + scorer points + assister
 * points} and {@code categoriesHit} (0-4) drives the multiplier.
 */
public record ScoreBreakdown(
        int winnerPoints,
        int scorePoints,
        int penaltyPoints,
        List<ScoreLine> scorers,
        List<ScoreLine> assisters,
        int categoriesHit,
        int baseTotal,
        double multiplier,
        int total
) {
}
