package byteblaze.backend.league.dto;

import byteblaze.backend.league.entity.LeagueVisibility;
import byteblaze.backend.league.entity.MembershipRole;

import java.util.UUID;

public record LeagueSummaryResponse(
        UUID id,
        String name,
        LeagueVisibility visibility,
        CompetitionSummary competition,
        MembershipRole role,
        long memberCount
) {
}
