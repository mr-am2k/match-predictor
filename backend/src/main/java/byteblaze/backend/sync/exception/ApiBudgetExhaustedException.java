package byteblaze.backend.sync.exception;

/**
 * Thrown when the API-Football daily call budget has been exhausted and an
 * outbound call would exceed the limit.
 * <p>
 * This exception is intentionally NOT surfaced through GlobalExceptionHandler:
 * it is an internal signal between sync-layer components. Scheduled tasks
 * generally just skip quietly (by observing {@link java.util.Optional#empty()}
 * from {@code ApiFootballClient}); callers that must abort a batch early can
 * throw this and log it.
 */
public class ApiBudgetExhaustedException extends RuntimeException {

    public ApiBudgetExhaustedException(String message) {
        super(message);
    }

    public ApiBudgetExhaustedException(String message, Throwable cause) {
        super(message, cause);
    }
}
