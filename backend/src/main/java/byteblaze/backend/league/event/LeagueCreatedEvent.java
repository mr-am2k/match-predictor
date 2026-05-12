package byteblaze.backend.league.event;

import java.util.UUID;

/**
 * Published (inside a {@code @Transactional} boundary) when a new league is
 * successfully created. Listeners should use
 * {@link org.springframework.transaction.event.TransactionalEventListener}
 * with {@code phase = AFTER_COMMIT} so they only fire once the league row is
 * safely persisted.
 */
public record LeagueCreatedEvent(UUID leagueId, Long competitionId) {
}
