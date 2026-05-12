package byteblaze.backend.overall.event;

/**
 * Published after the last fixture of a (competition, season) transitions to a
 * final status during a sync run. Listeners should use
 * {@link org.springframework.transaction.event.TransactionalEventListener} with
 * {@code phase = AFTER_COMMIT} so they only fire once the DB writes are safe.
 */
public record SeasonSettledEvent(Long competitionId, Integer seasonYear) {
}
