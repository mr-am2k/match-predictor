package byteblaze.backend.prediction.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record FixtureWithPrediction(
        Long id,
        OffsetDateTime kickoffAt,
        String status,
        TeamSummary homeTeam,
        TeamSummary awayTeam,
        Integer homeScore,
        Integer awayScore,
        List<PlayerSummary> homeSquad,
        List<PlayerSummary> awaySquad,
        MyPrediction userPrediction,
        OffsetDateTime lockedAt,
        boolean locked,
        boolean knockout
) {
}
