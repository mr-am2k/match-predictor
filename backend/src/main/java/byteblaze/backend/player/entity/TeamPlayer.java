package byteblaze.backend.player.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "team_players", schema = "external_data")
@IdClass(TeamPlayerId.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamPlayer {

    @Id
    @Column(name = "team_id")
    private Long teamId;

    @Id
    @Column(name = "player_id")
    private Long playerId;

    @Id
    @Column(name = "season_year")
    private Integer seasonYear;

    @Id
    @Column(name = "competition_id")
    private Long competitionId;

    @Column(name = "removed_at")
    private LocalDateTime removedAt;

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
