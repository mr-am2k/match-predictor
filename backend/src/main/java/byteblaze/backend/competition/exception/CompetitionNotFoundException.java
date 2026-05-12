package byteblaze.backend.competition.exception;

public class CompetitionNotFoundException extends RuntimeException {

    public CompetitionNotFoundException(String message) {
        super(message);
    }
}
