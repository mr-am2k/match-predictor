package byteblaze.backend.league.exception;

import java.util.UUID;

public class LeagueNotPublicException extends RuntimeException {

    public LeagueNotPublicException(UUID leagueId) {
        super("League " + leagueId + " is private, use join code");
    }
}
