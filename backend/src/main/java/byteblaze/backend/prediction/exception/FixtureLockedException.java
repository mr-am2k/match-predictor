package byteblaze.backend.prediction.exception;

import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
public class FixtureLockedException extends RuntimeException {

    private final Long fixtureId;
    private final OffsetDateTime kickoffAt;

    public FixtureLockedException(Long fixtureId, OffsetDateTime kickoffAt) {
        super("Fixture " + fixtureId + " is locked (kickoff " + kickoffAt + ")");
        this.fixtureId = fixtureId;
        this.kickoffAt = kickoffAt;
    }
}
