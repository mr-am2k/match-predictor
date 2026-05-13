package byteblaze.backend.prediction.exception;

import lombok.Getter;

@Getter
public class FixtureNotFoundException extends RuntimeException {

    private final Long fixtureId;

    public FixtureNotFoundException(Long fixtureId) {
        super("Fixture not found: " + fixtureId);
        this.fixtureId = fixtureId;
    }
}
