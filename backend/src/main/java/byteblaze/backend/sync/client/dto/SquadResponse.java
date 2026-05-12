package byteblaze.backend.sync.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SquadResponse(List<SquadRow> response) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SquadRow(TeamRef team, List<PlayerEntry> players) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TeamRef(Long id, String name, String logo) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlayerEntry(Long id,
                              String name,
                              Integer age,
                              Integer number,
                              String position,
                              String photo) {
    }
}
