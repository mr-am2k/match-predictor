package byteblaze.backend.competition;

import java.util.List;

public record ApiFootballLeagueResponse(List<LeagueEntry> response) {

    public record LeagueEntry
            (
                League league,
                Country country,
                List<Season> seasons
            ) {}

    public record League
            (
                Long id,
                String name,
                String type,
                String logo
            ) {}

    public record Country
            (
                String name,
                String flag
            ) {}

    public record Season
            (
                Integer year,
                String start,
                String end,
                boolean current
            ) {}
}