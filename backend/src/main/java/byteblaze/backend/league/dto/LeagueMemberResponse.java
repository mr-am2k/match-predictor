package byteblaze.backend.league.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record LeagueMemberResponse(
        UUID userId,
        String username,
        String role,
        LocalDateTime joinedAt
) {
}
