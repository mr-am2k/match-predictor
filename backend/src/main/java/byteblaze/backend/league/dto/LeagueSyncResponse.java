package byteblaze.backend.league.dto;

/**
 * Result of an owner-triggered "sync match data" request for a league's
 * competition. {@code triggered} is false when the request was throttled by the
 * per-competition cooldown; {@code usedLast24h}/{@code dailyLimit} echo the
 * current API-Football budget so the UI can show how much headroom is left.
 */
public record LeagueSyncResponse(
        boolean triggered,
        String message,
        long usedLast24h,
        int dailyLimit
) {
}
