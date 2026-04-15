package byteblaze.backend.auth.dto;

import java.util.UUID;

public record AuthResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String username,
        String role,
        String message
) {
}
