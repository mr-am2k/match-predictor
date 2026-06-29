package byteblaze.backend.scoring.rules.dto;

import java.math.BigDecimal;

/**
 * Response payload for {@code GET/PUT /api/v1/leagues/{id}/scoring-rules}.
 *
 * <p>{@code editable} is {@code true} iff no predictions have been submitted in
 * this league — once one is in, the rules are frozen to keep scoring fair for
 * early predictors (plan §1.3).</p>
 */
public record LeagueScoringRulesResponse(
        int matchWinnerPoints,
        int matchExactScorePoints,
        int matchScorerPoints,
        int matchAssisterPoints,
        int leagueWinnerPoints,
        int leagueTopScorerPoints,
        int leagueTopAssisterPoints,
        BigDecimal matchBonus2x,
        BigDecimal matchBonus3x,
        BigDecimal matchBonus4x,
        BigDecimal leagueBonus2of3,
        BigDecimal leagueBonus3of3,
        boolean assistersEnabled,
        boolean penaltiesEnabled,
        int penaltyWinnerPoints,
        boolean editable
) {
}
