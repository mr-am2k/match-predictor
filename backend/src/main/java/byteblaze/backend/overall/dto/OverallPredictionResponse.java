package byteblaze.backend.overall.dto;

import java.time.LocalDate;
import java.util.UUID;

public record OverallPredictionResponse(
        UUID id,
        Long winnerTeamId,
        Long topScorerPlayerId,
        Long topAssisterPlayerId,
        LocalDate locksAt,
        boolean locked
) {
}
