package byteblaze.backend.player.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class TeamPlayerId implements Serializable {

    private Long teamId;
    private Long playerId;
    private Integer seasonYear;
    private Long competitionId;
}
