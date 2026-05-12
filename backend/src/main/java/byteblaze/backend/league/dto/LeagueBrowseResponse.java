package byteblaze.backend.league.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record LeagueBrowseResponse(
        UUID id,
        String name,
        CompetitionSummary competition,
        OwnerSummary owner,
        Integer seasonYear,
        long memberCount,
        LocalDateTime createdAt,
        boolean joined
) {
}
