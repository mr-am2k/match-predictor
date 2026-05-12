package byteblaze.backend.prediction.dto;

import java.time.OffsetDateTime;

public record GameweekSummaryResponse(
        String round,
        OffsetDateTime firstKickoffAt,
        OffsetDateTime locksAt,
        int fixtureCount,
        int userPredictionCount,
        String status
) {
}
