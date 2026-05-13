package byteblaze.backend.sync.dto;

public record BootstrapResult(
        Long competitionId,
        String name,
        Integer seasonYear,
        long teamCount,
        long fixtureCount,
        long activeSquadLinkCount,
        long apiCallsUsedLast24h,
        int dailyLimit,
        long durationMs
) {
}
