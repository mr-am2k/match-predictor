package byteblaze.backend.fixture.admin.dto;

import byteblaze.backend.fixture.entity.FixtureStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

/**
 * Admin request to correct a fixture's result.
 *
 * <p>{@code scorers}/{@code assisters} are expanded into individual
 * {@code fixture_events} rows (one per goal / per assist). {@code status}
 * defaults to {@link FixtureStatus#FT} when omitted.</p>
 */
public record EditFixtureResultRequest(
        @NotNull @PositiveOrZero Integer homeScore,
        @NotNull @PositiveOrZero Integer awayScore,
        FixtureStatus status,
        @PositiveOrZero Integer penaltyHomeScore,
        @PositiveOrZero Integer penaltyAwayScore,
        @Valid List<ScorerInput> scorers,
        @Valid List<AssisterInput> assisters
) {

    public record ScorerInput(
            @NotNull Long playerId,
            @NotNull Long teamId,
            @NotNull @Positive Integer goals,
            Boolean ownGoal
    ) {
    }

    public record AssisterInput(
            @NotNull Long playerId,
            @NotNull Long teamId,
            @NotNull @Positive Integer assists
    ) {
    }
}
