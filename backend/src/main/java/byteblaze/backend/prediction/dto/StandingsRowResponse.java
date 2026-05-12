package byteblaze.backend.prediction.dto;

import java.util.UUID;

/**
 * One row in the league standings.
 *
 * <p>{@code gameweeksPlayed} is named per Phase 2 plan §4.4, but in this
 * phase it actually counts <em>distinct settled-fixture predictions</em> —
 * i.e. the number of matches the user has a scored prediction on. Since
 * scoring only runs after a fixture transitions to final, unsettled
 * predictions are naturally excluded.</p>
 */
public record StandingsRowResponse(
        UUID userId,
        String username,
        int totalPoints,
        int gameweeksPlayed,
        int rank
) {
}
