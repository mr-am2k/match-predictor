package byteblaze.backend.admin.dto;

import java.time.LocalDateTime;

public record AdminCompetitionResponse(
        Long id,
        String name,
        String type,
        String logoUrl,
        String countryName,
        Integer seasonYear,
        boolean active,
        LocalDateTime lastSyncedAt,
        long leagueCount,
        long activeLeagueCount,
        long fixtureCount
) {
}
