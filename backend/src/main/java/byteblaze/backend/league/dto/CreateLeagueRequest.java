package byteblaze.backend.league.dto;

import byteblaze.backend.league.entity.LeagueVisibility;
import byteblaze.backend.scoring.rules.dto.LeagueScoringRulesRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateLeagueRequest(
        @NotBlank(message = "Name is required")
        @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
        String name,

        @NotNull(message = "Visibility is required")
        LeagueVisibility visibility,

        @NotNull(message = "Competition ID is required")
        Long competitionId,

        @Valid
        LeagueScoringRulesRequest scoringRules
) {
}
