package byteblaze.backend.prediction.dto;

/**
 * One scorer/assister line within a scored prediction's breakdown: what the
 * user predicted, what actually happened, and the points it earned.
 */
public record ScoreLine(
        Long playerId,
        String name,
        int predicted,
        int actual,
        boolean correct,
        int points
) {
}
