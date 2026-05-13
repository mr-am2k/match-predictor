package byteblaze.backend.sync.client;

import byteblaze.backend.sync.budget.ApiCallBudget;
import byteblaze.backend.sync.client.dto.FixtureEventsResponse;
import byteblaze.backend.sync.client.dto.FixturesResponse;
import byteblaze.backend.sync.client.dto.SquadResponse;
import byteblaze.backend.sync.client.dto.TeamsResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * Thin wrapper around the shared {@link RestClient} bean that also enforces the
 * API-Football daily call budget via {@link ApiCallBudget}. Every outbound call
 * goes through this class; no other component should call the {@code RestClient}
 * bean directly.
 */
@Component
@Slf4j
public class ApiFootballClient {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private static final String ENDPOINT_FIXTURES = "/fixtures";
    private static final String ENDPOINT_FIXTURE_EVENTS = "/fixtures/events";
    private static final String ENDPOINT_TEAMS = "/teams";
    private static final String ENDPOINT_SQUADS = "/players/squads";

    private final RestClient restClient;
    private final ApiCallBudget budget;

    public ApiFootballClient(
            @Qualifier("restClientExternalApi") final RestClient restClient,
            final ApiCallBudget budget) {
        this.restClient = restClient;
        this.budget = budget;
    }

    public Optional<FixturesResponse> fetchLiveFixtures(long competitionId, int seasonYear) {
        String uri = String.format("%s?league=%d&season=%d&live=all",
                ENDPOINT_FIXTURES, competitionId, seasonYear);
        return execute(ENDPOINT_FIXTURES, competitionId, uri, FixturesResponse.class,
                "live=all league=" + competitionId);
    }

    public Optional<FixturesResponse> fetchUpcomingFixtures(long competitionId, int seasonYear) {
        String uri = String.format("%s?league=%d&season=%d&next=20",
                ENDPOINT_FIXTURES, competitionId, seasonYear);
        return execute(ENDPOINT_FIXTURES, competitionId, uri, FixturesResponse.class,
                "next=20 league=" + competitionId);
    }

    public Optional<FixturesResponse> fetchFixturesForDate(long competitionId, int seasonYear, LocalDate date) {
        String uri = String.format("%s?league=%d&season=%d&date=%s",
                ENDPOINT_FIXTURES, competitionId, seasonYear, DATE_FORMAT.format(date));
        return execute(ENDPOINT_FIXTURES, competitionId, uri, FixturesResponse.class,
                "date=" + date + " league=" + competitionId);
    }

    public Optional<FixtureEventsResponse> fetchFixtureEvents(long fixtureId) {
        String uri = String.format("%s?fixture=%d", ENDPOINT_FIXTURE_EVENTS, fixtureId);
        return execute(ENDPOINT_FIXTURE_EVENTS, null, uri, FixtureEventsResponse.class,
                "fixture=" + fixtureId);
    }

    public Optional<TeamsResponse> fetchTeams(long competitionId, int seasonYear) {
        String uri = String.format("%s?league=%d&season=%d",
                ENDPOINT_TEAMS, competitionId, seasonYear);
        return execute(ENDPOINT_TEAMS, competitionId, uri, TeamsResponse.class,
                "league=" + competitionId);
    }

    public Optional<SquadResponse> fetchSquad(long teamId) {
        String uri = String.format("%s?team=%d", ENDPOINT_SQUADS, teamId);
        return execute(ENDPOINT_SQUADS, null, uri, SquadResponse.class,
                "team=" + teamId);
    }

    /**
     * API-Football returns the round as a string like {@code "Regular Season - 12"}.
     * We keep that string as-is and use it as our "gameweek" key.
     */
    public String extractRoundString(String apiRound) {
        return apiRound;
    }

    private <T> Optional<T> execute(String endpoint,
                                    Long competitionId,
                                    String uri,
                                    Class<T> responseType,
                                    String note) {
        if (!budget.reserve(endpoint)) {
            return Optional.empty();
        }

        Integer statusCode = null;
        String callNote = note;
        try {
            T body = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(responseType);
            statusCode = 200;
            return Optional.ofNullable(body);
        } catch (RestClientResponseException e) {
            statusCode = e.getStatusCode().value();
            callNote = (note == null ? "" : note + " ") + "http-error: " + e.getMessage();
            log.error("API-Football call failed {} (status={}): {}", uri, statusCode, e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            statusCode = -1;
            callNote = (note == null ? "" : note + " ") + "exception: " + e.getMessage();
            log.error("API-Football call errored {}: {}", uri, e.getMessage(), e);
            return Optional.empty();
        } finally {
            try {
                budget.record(endpoint, competitionId, statusCode, callNote);
            } catch (Exception loggingError) {
                log.warn("Failed to record api_call_log row for {}: {}", endpoint, loggingError.getMessage());
            }
        }
    }
}
