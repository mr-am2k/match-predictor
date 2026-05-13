package byteblaze.backend.league.entity;

import byteblaze.backend.auth.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "league_memberships",
        schema = "app",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_league_memberships_league_user",
                columnNames = {"league_id", "user_id"}
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeagueMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "league_id", nullable = false)
    private League league;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MembershipRole role;

    private LocalDateTime joinedAt;

    @PrePersist
    public void onCreate() {
        joinedAt = LocalDateTime.now();
    }
}
