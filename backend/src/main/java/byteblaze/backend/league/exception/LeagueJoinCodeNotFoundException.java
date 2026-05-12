package byteblaze.backend.league.exception;

public class LeagueJoinCodeNotFoundException extends RuntimeException {

    public LeagueJoinCodeNotFoundException(String code) {
        super("No league with code " + code);
    }
}
