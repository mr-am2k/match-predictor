package byteblaze.backend.prediction.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Strongly-typed bindings for the {@code scoring.*} config block.
 *
 * <p>After Phase 3, the {@code *Points} fields are only consulted as the
 * <em>defaults source</em> when seeding a brand-new league that lacks its
 * {@code league_scoring_rules} row; runtime scoring reads everything from the
 * per-league row.</p>
 */
@ConfigurationProperties(prefix = "scoring")
public record ScoringProperties(
        int winnerPoints,
        int exactScorePoints,
        int scorerPoints,
        int assisterPoints
) {
}
