package byteblaze.backend.fixture.event;

/**
 * Published (inside a {@code @Transactional} boundary) when a fixture
 * transitions from non-final to final status during sync. Listeners should use
 * {@link org.springframework.transaction.event.TransactionalEventListener}
 * with {@code phase = AFTER_COMMIT} so they only fire once the DB row is safely
 * persisted.
 */
public record FixtureSettledEvent(Long fixtureId) {
}
