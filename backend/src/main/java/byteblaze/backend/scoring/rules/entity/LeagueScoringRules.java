package byteblaze.backend.scoring.rules.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Per-league scoring configuration (see {@code V9__league_scoring_rules.sql}).
 *
 * <p>{@code leagueId} is both the primary key and the FK to {@code app.leagues(id)}.
 * Stored as a scalar UUID — no JPA relation back to {@link byteblaze.backend.league.entity.League}
 * so the scoring engine can load rules without dragging in league state.</p>
 */
@Entity
@Table(name = "league_scoring_rules", schema = "app")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeagueScoringRules {

    @Id
    @Column(name = "league_id", nullable = false)
    private UUID leagueId;

    @Column(name = "match_winner_points", nullable = false)
    private int matchWinnerPoints;

    @Column(name = "match_exact_score_points", nullable = false)
    private int matchExactScorePoints;

    @Column(name = "match_scorer_points", nullable = false)
    private int matchScorerPoints;

    @Column(name = "match_assister_points", nullable = false)
    private int matchAssisterPoints;

    @Column(name = "league_winner_points", nullable = false)
    private int leagueWinnerPoints;

    @Column(name = "league_top_scorer_points", nullable = false)
    private int leagueTopScorerPoints;

    @Column(name = "league_top_assister_points", nullable = false)
    private int leagueTopAssisterPoints;

    @Column(name = "match_bonus_2x", nullable = false, precision = 4, scale = 2)
    private BigDecimal matchBonus2x;

    @Column(name = "match_bonus_3x", nullable = false, precision = 4, scale = 2)
    private BigDecimal matchBonus3x;

    @Column(name = "match_bonus_4x", nullable = false, precision = 4, scale = 2)
    private BigDecimal matchBonus4x;

    @Column(name = "league_bonus_2of3", nullable = false, precision = 4, scale = 2)
    private BigDecimal leagueBonus2of3;

    @Column(name = "league_bonus_3of3", nullable = false, precision = 4, scale = 2)
    private BigDecimal leagueBonus3of3;

    /**
     * Whether per-match assister picks are active for this league (V13). When
     * {@code false} the scoring engine ignores assisters and re-tiers the match
     * bonus to three categories; the prediction UI hides the assister section.
     * Fully reversible — flipping back to {@code true} restores assisters going
     * forward without touching already-settled scores.
     */
    @Column(name = "assisters_enabled", nullable = false)
    private boolean assistersEnabled;

    /**
     * Whether knockout penalty-shootout predictions are scored for this league
     * (V15). Unlike the other rules, this toggle is NOT frozen once predictions
     * exist — an owner can switch it on mid-season. {@link #penaltiesEnabledAt}
     * records when, and the scoring engine only awards penalty points for
     * fixtures whose prediction window was still open at that moment, so
     * already-locked/played matches are never affected.
     */
    @Column(name = "penalties_enabled", nullable = false)
    private boolean penaltiesEnabled;

    @Column(name = "penalty_winner_points", nullable = false)
    private int penaltyWinnerPoints;

    @Column(name = "penalties_enabled_at")
    private LocalDateTime penaltiesEnabledAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
