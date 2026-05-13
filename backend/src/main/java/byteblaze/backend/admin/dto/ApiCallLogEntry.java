package byteblaze.backend.admin.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ApiCallLogEntry(
        UUID id,
        LocalDateTime calledAt,
        String endpoint,
        Long competitionId,
        Integer statusCode,
        String note
) {
}
