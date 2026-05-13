package byteblaze.backend.prediction.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PlayerPick(
    @NotNull Long playerId,
    @NotNull @Min(1) Integer count
) {}
