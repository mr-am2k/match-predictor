package byteblaze.backend.prediction.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * All league members' predictions for a single fixture.
 *
 * <p>Predictions stay hidden until the fixture locks (kickoff - 15m). When
 * {@code locked} is false the {@code predictions} list is empty by design;
 * {@code memberCount} / {@code predictionCount} are still returned so the UI
 * can tease how many members have already picked.
 */
public record FixturePredictionsResponse(
        Long fixtureId,
        boolean locked,
        OffsetDateTime lockedAt,
        int memberCount,
        int predictionCount,
        List<OtherPrediction> predictions
) {
}
