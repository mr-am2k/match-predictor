package byteblaze.backend.league.dto;

import byteblaze.backend.league.entity.LeagueVisibility;

import java.time.LocalDateTime;
import java.util.UUID;

public record LeagueResponse(
        UUID id,
        String name,
        LeagueVisibility visibility,
        String joinCode,
        CompetitionSummary competition,
        OwnerSummary owner,
        long memberCount,
        LocalDateTime createdAt
) {
}
