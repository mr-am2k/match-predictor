package byteblaze.backend.prediction.dto;

import java.util.UUID;

/**
 * One row in a per-gameweek standings breakdown.
 *
 * <p>Unlike {@link StandingsRowResponse}, this is scoped to a single
 * {@code round} (gameweek key) within the league's competition / season.
 * {@code gameweekPoints} is the sum of scored points across the user's
 * predictions for fixtures in that round; {@code predictionsCount} is the
 * distinct count of fixtures the user predicted in the round.</p>
 */
public record GameweekStandingsRowResponse(
        UUID userId,
        String username,
        int gameweekPoints,
        int predictionsCount,
        int rank
) {
}
