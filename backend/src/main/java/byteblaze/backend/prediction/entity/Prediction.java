package byteblaze.backend.prediction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "predictions", schema = "app")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "league_id", nullable = false)
    private UUID leagueId;

    @Column(name = "fixture_id", nullable = false)
    private Long fixtureId;

    @Column(name = "winner_team_id")
    private Long winnerTeamId;

    @Column(name = "predicted_draw", nullable = false)
    private boolean predictedDraw;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
