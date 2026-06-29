package byteblaze.backend.prediction.dto;

import java.util.List;

public record MyPrediction(
        Long winnerTeamId,
        boolean predictedDraw,
        Long penaltyWinnerTeamId,
        Integer homeScore,
        Integer awayScore,
        List<PlayerPick> scorers,
        List<PlayerPick> assisters,
        Integer points,
        ScoreBreakdown breakdown
) {
}
