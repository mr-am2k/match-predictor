package byteblaze.backend.fixture.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Entity
@Table(name = "fixtures", schema = "external_data")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Fixture {

    @Id
    private Long id;

    @Column(name = "competition_id", nullable = false)
    private Long competitionId;

    @Column(name = "season_year", nullable = false)
    private Integer seasonYear;

    @Column(nullable = false)
    private String round;

    @Column(name = "kickoff_at", nullable = false)
    private OffsetDateTime kickoffAt;

    @Convert(converter = FixtureStatusConverter.class)
    @Column(nullable = false)
    private FixtureStatus status;

    @Column(name = "home_team_id")
    private Long homeTeamId;

    @Column(name = "away_team_id")
    private Long awayTeamId;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    @Column(name = "winner_team_id")
    private Long winnerTeamId;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    /**
     * True once an admin has manually corrected this fixture's result/events.
     * Such fixtures are skipped by the API-Football sync so the correction
     * is not overwritten by (potentially wrong) upstream data.
     */
    @Column(name = "manually_overridden", nullable = false)
    private boolean manuallyOverridden;

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
