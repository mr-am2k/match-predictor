package byteblaze.backend.prediction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prediction_scores", schema = "app")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionScore {

    @Id
    @Column(name = "prediction_id")
    private UUID predictionId;

    @Column(nullable = false)
    private int points;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String breakdown;

    @Column(name = "settled_at", nullable = false)
    private LocalDateTime settledAt;

    @PrePersist
    public void onCreate() {
        if (settledAt == null) {
            settledAt = LocalDateTime.now();
        }
    }
}
