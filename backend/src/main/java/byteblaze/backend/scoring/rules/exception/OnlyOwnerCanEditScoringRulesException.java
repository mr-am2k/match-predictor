package byteblaze.backend.scoring.rules.exception;

/**
 * Thrown when a non-owner member hits {@code PUT /api/v1/leagues/{id}/scoring-rules}.
 * Maps to HTTP 403 Forbidden.
 */
public class OnlyOwnerCanEditScoringRulesException extends RuntimeException {

    public OnlyOwnerCanEditScoringRulesException() {
        super("Only the league owner can edit scoring rules.");
    }
}
