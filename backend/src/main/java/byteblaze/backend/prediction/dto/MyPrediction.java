package byteblaze.backend.prediction.dto;

import java.util.List;

public record MyPrediction(
        Long winnerTeamId,
        boolean predictedDraw,
        Integer homeScore,
        Integer awayScore,
        List<PlayerPick> scorers,
        List<PlayerPick> assisters
) {
}
