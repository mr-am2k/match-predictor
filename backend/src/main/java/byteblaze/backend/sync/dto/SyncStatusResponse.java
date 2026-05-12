package byteblaze.backend.sync.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SyncStatusResponse(
        long apiCallsUsedLast24h,
        int dailyLimit,
        List<CompetitionSyncState> activeCompetitions
) {
    public record CompetitionSyncState(
            Long competitionId,
            String name,
            Integer seasonYear,
            LocalDateTime lastSyncedAt,
            long leagueCount,
            long teamCount,
            long fixtureCount,
            long activeSquadLinkCount
    ) {
    }
}
