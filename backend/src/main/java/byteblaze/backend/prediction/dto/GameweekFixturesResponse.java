package byteblaze.backend.prediction.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record GameweekFixturesResponse(
        String round,
        OffsetDateTime locksAt,
        boolean locked,
        List<FixtureWithPrediction> fixtures
) {
}
