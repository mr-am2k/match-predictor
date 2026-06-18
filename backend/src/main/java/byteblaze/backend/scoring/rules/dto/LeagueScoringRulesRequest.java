package byteblaze.backend.scoring.rules.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body for creating or updating per-league scoring rules. Ranges mirror
 * the {@code chk_points_nonneg} / {@code chk_multipliers_range} CHECK constraints
 * on {@code app.league_scoring_rules} — see plan §1.1.
 */
public record LeagueScoringRulesRequest(
        @NotNull @Min(0) @Max(50)
        Integer matchWinnerPoints,

        @NotNull @Min(0) @Max(50)
        Integer matchExactScorePoints,

        @NotNull @Min(0) @Max(50)
        Integer matchScorerPoints,

        @NotNull @Min(0) @Max(50)
        Integer matchAssisterPoints,

        @NotNull @Min(0) @Max(100)
        Integer leagueWinnerPoints,

        @NotNull @Min(0) @Max(100)
        Integer leagueTopScorerPoints,

        @NotNull @Min(0) @Max(100)
        Integer leagueTopAssisterPoints,

        @NotNull @DecimalMin("1.00") @DecimalMax("10.00")
        BigDecimal matchBonus2x,

        @NotNull @DecimalMin("1.00") @DecimalMax("10.00")
        BigDecimal matchBonus3x,

        @NotNull @DecimalMin("1.00") @DecimalMax("10.00")
        BigDecimal matchBonus4x,

        @NotNull @DecimalMin("1.00") @DecimalMax("10.00")
        BigDecimal leagueBonus2of3,

        @NotNull @DecimalMin("1.00") @DecimalMax("10.00")
        BigDecimal leagueBonus3of3,

        // Per-match assister toggle (V13). Nullable for backward compatibility —
        // older clients and the league-creation flow may omit it, in which case
        // it is treated as enabled (true). See LeagueScoringRulesServiceImpl.
        Boolean assistersEnabled
) {
}
