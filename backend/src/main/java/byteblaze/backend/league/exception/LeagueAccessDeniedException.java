package byteblaze.backend.league.exception;

public class LeagueAccessDeniedException extends RuntimeException {

    public LeagueAccessDeniedException(String message) {
        super(message);
    }
}
