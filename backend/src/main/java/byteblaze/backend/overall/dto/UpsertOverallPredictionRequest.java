package byteblaze.backend.overall.dto;

public record UpsertOverallPredictionRequest(
        Long winnerTeamId,
        Long topScorerPlayerId,
        Long topAssisterPlayerId
) {
}
