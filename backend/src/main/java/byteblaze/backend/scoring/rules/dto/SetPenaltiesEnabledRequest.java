package byteblaze.backend.scoring.rules.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Body for {@code PATCH /api/v1/leagues/{id}/scoring-rules/penalties}. Flips the
 * knockout-penalties toggle. Unlike the full rules update this is NOT blocked by
 * the post-prediction freeze, so an owner can enable penalties mid-season.
 */
public record SetPenaltiesEnabledRequest(
        @NotNull Boolean enabled
) {
}
