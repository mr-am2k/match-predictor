package byteblaze.backend.prediction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "prediction_scorers", schema = "app")
@IdClass(PredictionScorerId.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionScorer {

    @Id
    @Column(name = "prediction_id")
    private UUID predictionId;

    @Id
    @Column(name = "player_id")
    private Long playerId;
}
