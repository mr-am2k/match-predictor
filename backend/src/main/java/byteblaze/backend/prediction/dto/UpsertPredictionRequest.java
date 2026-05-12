package byteblaze.backend.prediction.dto;

import jakarta.validation.Valid;

import java.util.List;

public record UpsertPredictionRequest(
        Long winnerTeamId,
        boolean predictedDraw,
        Integer homeScore,
        Integer awayScore,
        @Valid List<PlayerPick> scorers,
        @Valid List<PlayerPick> assisters
) {
}
