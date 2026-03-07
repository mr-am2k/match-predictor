package byteblaze.backend.competition;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class CompetitionSyncServiceImpl implements CompetitionSyncService {
    private final CompetitionRepository competitionRepository;
    private final RestClient restClient;
    private final List<Long> whitelistedIds;

    public CompetitionSyncServiceImpl(
            final CompetitionRepository competitionRepository,
            final RestClient restClient,
            @Value("#{'${api.football.whitelisted-ids}'.split(',')}") List<Long> whitelistedIds) {
        this.competitionRepository = competitionRepository;
        this.restClient = restClient;
        this.whitelistedIds = whitelistedIds;
    }

    @Override
    public void sync() {
        log.info("Starting competition sync...");

        final ApiFootballLeagueResponse response = restClient.get()
                .uri("/leagues?current=true")
                .retrieve()
                .body(ApiFootballLeagueResponse.class);

        if (response == null || response.response() == null) {
            log.warn("No response received from API-Football");
            return;
        }

        final List<Competition> competitions = response.response().stream()
                .filter(entry -> whitelistedIds.contains(entry.league().id()))
                .map(this::mapToCompetition)
                .toList();

        competitionRepository.saveAll(competitions);
        log.info("Synced {} competitions", competitions.size());
    }

    private Competition mapToCompetition(final ApiFootballLeagueResponse.LeagueEntry entry) {
        final ApiFootballLeagueResponse.Season currentSeason = entry.seasons().stream()
                .filter(ApiFootballLeagueResponse.Season::current)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "No current season found for league: " + entry.league().id()
                ));

        final Competition competition = competitionRepository.findById(entry.league().id())
                .orElse(new Competition());

        competition.setId(entry.league().id());
        competition.setName(entry.league().name());
        competition.setType(entry.league().type());
        competition.setLogoUrl(entry.league().logo());
        competition.setCountryName(entry.country().name());
        competition.setCountryFlagUrl(entry.country().flag());
        competition.setSeasonYear(currentSeason.year());
        competition.setSeasonStart(LocalDate.parse(currentSeason.start()));
        competition.setSeasonEnd(LocalDate.parse(currentSeason.end()));
        competition.setLastSyncedAt(LocalDateTime.now());

        return competition;
    }
}
