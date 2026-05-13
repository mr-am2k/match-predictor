package byteblaze.backend.league.dto;

public record JoinResult(
        LeagueResponse league,
        boolean created
) {
}
