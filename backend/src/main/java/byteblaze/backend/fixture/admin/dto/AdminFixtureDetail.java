package byteblaze.backend.fixture.admin.dto;

import byteblaze.backend.prediction.dto.PlayerSummary;
import byteblaze.backend.prediction.dto.TeamSummary;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Full fixture view for the admin editor: current score/status, current
 * scorer/assister lines, and both teams' rosters to pick players from.
 */
public record AdminFixtureDetail(
        Long id,
        Long competitionId,
        Integer seasonYear,
        String round,
        OffsetDateTime kickoffAt,
        String status,
        TeamSummary homeTeam,
        TeamSummary awayTeam,
        Integer homeScore,
        Integer awayScore,
        boolean manuallyOverridden,
        List<PlayerSummary> homeRoster,
        List<PlayerSummary> awayRoster,
        List<EventLine> scorers,
        List<EventLine> assisters
) {
}
