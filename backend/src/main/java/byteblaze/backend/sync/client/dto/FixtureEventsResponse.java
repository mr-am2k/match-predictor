package byteblaze.backend.sync.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FixtureEventsResponse(List<EventRow> response) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EventRow(Time time,
                           Team team,
                           Player player,
                           Assist assist,
                           String type,
                           String detail,
                           String comments) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Time(Integer elapsed, Integer extra) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Team(Long id, String name, String logo) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Player(Long id, String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Assist(Long id, String name) {
    }
}
