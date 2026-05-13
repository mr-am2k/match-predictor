package byteblaze.backend.overall.exception;

import lombok.Getter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
public class OverallPredictionLockedException extends RuntimeException {

    private final UUID leagueId;
    private final LocalDate locksAt;

    public OverallPredictionLockedException(UUID leagueId, LocalDate locksAt) {
        super("Overall prediction for league " + leagueId + " is locked "
                + (locksAt != null ? "since " + locksAt : ""));
        this.leagueId = leagueId;
        this.locksAt = locksAt;
    }
}
