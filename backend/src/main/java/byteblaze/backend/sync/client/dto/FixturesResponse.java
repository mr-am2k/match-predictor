package byteblaze.backend.sync.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FixturesResponse(List<FixtureRow> response) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FixtureRow(Fixture fixture, League league, Teams teams, Goals goals, Score score) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Fixture(Long id, String date, Status status) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Status(@JsonProperty("short") String shortCode,
                         @JsonProperty("long") String longName,
                         Integer elapsed) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record League(Long id, String name, Integer season, String round) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Teams(TeamRef home, TeamRef away) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TeamRef(Long id, String name, String logo) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Goals(Integer home, Integer away) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Score(Halftime halftime, Fulltime fulltime, Extratime extratime, Penalty penalty) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Halftime(Integer home, Integer away) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Fulltime(Integer home, Integer away) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Extratime(Integer home, Integer away) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Penalty(Integer home, Integer away) {
    }
}
