package byteblaze.backend.fixture.admin.dto;

import byteblaze.backend.prediction.dto.TeamSummary;

import java.time.OffsetDateTime;

/**
 * Lightweight fixture row for the admin fixtures list (pick which match to edit).
 */
public record AdminFixtureSummary(
        Long id,
        String round,
        OffsetDateTime kickoffAt,
        String status,
        TeamSummary homeTeam,
        TeamSummary awayTeam,
        Integer homeScore,
        Integer awayScore,
        boolean manuallyOverridden
) {
}
