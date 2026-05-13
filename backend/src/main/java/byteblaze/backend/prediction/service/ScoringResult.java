package byteblaze.backend.prediction.service;

/**
 * Output of {@link ScoringEngine#score}: the total points awarded to the
 * prediction and the serialized JSON breakdown stored on
 * {@code prediction_scores.breakdown}.
 */
public record ScoringResult(int points, String breakdownJson) {
}
