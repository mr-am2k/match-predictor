package byteblaze.backend.prediction.exception;

import lombok.Getter;

import java.util.UUID;

@Getter
public class FixtureNotInLeagueException extends RuntimeException {

    private final Long fixtureId;
    private final UUID leagueId;

    public FixtureNotInLeagueException(Long fixtureId, UUID leagueId) {
        super("Fixture " + fixtureId + " does not belong to league " + leagueId);
        this.fixtureId = fixtureId;
        this.leagueId = leagueId;
    }
}
