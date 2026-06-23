package byteblaze.backend.fixture.admin.dto;

/**
 * Result of an admin fixture edit: how many per-match predictions were
 * re-scored, and whether the season-long (overall) predictions were also
 * recomputed (only when the whole season is already finished).
 */
public record EditFixtureResultResponse(
        Long fixtureId,
        int predictionsRescored,
        boolean overallRescored,
        Integer homeScore,
        Integer awayScore,
        String status
) {
}
