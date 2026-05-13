package byteblaze.backend.scoring.rules.exception;

/**
 * Thrown when an owner tries to edit {@code league_scoring_rules} after the
 * first prediction has been submitted for the league — see plan §1.3. Maps to
 * HTTP 423 Locked.
 */
public class ScoringRulesLockedException extends RuntimeException {

    public ScoringRulesLockedException() {
        super("Scoring rules are locked once the first prediction is submitted.");
    }
}
