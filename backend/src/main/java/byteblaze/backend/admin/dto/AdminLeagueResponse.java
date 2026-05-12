package byteblaze.backend.admin.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminLeagueResponse(
        UUID id,
        String name,
        String visibility,
        String competitionName,
        Integer seasonYear,
        String ownerUsername,
        long memberCount,
        boolean archived,
        LocalDateTime createdAt
) {
}
