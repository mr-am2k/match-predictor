package byteblaze.backend.league.dto;

import java.util.UUID;

public record OwnerSummary(
        UUID id,
        String username
) {
}
