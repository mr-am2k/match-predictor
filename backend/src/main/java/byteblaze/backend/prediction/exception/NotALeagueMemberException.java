package byteblaze.backend.prediction.exception;

import lombok.Getter;

import java.util.UUID;

@Getter
public class NotALeagueMemberException extends RuntimeException {

    private final UUID leagueId;
    private final UUID userId;

    public NotALeagueMemberException(UUID leagueId, UUID userId) {
        super("User " + userId + " is not a member of league " + leagueId);
        this.leagueId = leagueId;
        this.userId = userId;
    }
}
