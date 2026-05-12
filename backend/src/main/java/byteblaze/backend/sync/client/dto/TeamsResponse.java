package byteblaze.backend.sync.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TeamsResponse(List<TeamRow> response) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TeamRow(TeamInfo team) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TeamInfo(Long id, String name, String code, String country, String logo) {
    }
}
