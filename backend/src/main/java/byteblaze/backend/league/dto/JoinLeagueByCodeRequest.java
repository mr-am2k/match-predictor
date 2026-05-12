package byteblaze.backend.league.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinLeagueByCodeRequest(
        @NotBlank(message = "Join code is required")
        @Size(min = 4, max = 12, message = "Join code must be between 4 and 12 characters")
        String code
) {
}
