package byteblaze.backend.league.exception;

public class LeagueNotFoundException extends RuntimeException {

    public LeagueNotFoundException(String message) {
        super(message);
    }
}
