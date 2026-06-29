package byteblaze.backend.fixture.entity;

import java.util.Locale;

/**
 * Helpers for interpreting API-Football's free-text {@code round} string
 * (e.g. "Group Stage - 1", "Round of 16", "Quarter-finals", "Final").
 */
public final class FixtureRounds {

    private FixtureRounds() {
    }

    /**
     * Whether a round string names a single-elimination (knockout) stage, where a
     * tie can go to extra time and penalties. Group/league rounds return false.
     * Matching is on lowercased substrings so it tolerates the slight naming
     * variations across competitions.
     */
    public static boolean isKnockout(String round) {
        if (round == null) {
            return false;
        }
        String r = round.toLowerCase(Locale.ROOT);
        return r.contains("final")          // Final, Semi-finals, Quarter-finals, 3rd Place Final
                || r.contains("semi")
                || r.contains("quarter")
                || r.contains("round of")    // Round of 16, Round of 32
                || r.contains("play-off")
                || r.contains("playoff")
                || r.contains("knockout");
    }
}
