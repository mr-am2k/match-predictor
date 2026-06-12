package byteblaze.backend.prediction.dto;

import java.util.List;
import java.util.UUID;

/**
 * One league member's prediction for a fixture, exposed only after the fixture
 * has locked. {@code points} is null until the fixture has been settled/scored.
 */
public record OtherPrediction(
        UUID userId,
        String username,
        boolean isCurrentUser,
        Long winnerTeamId,
        boolean predictedDraw,
        Integer homeScore,
        Integer awayScore,
        List<PlayerPickView> scorers,
        List<PlayerPickView> assisters,
        Integer points,
        ScoreBreakdown breakdown
) {
}
