package byteblaze.backend.prediction.repository;

import byteblaze.backend.prediction.entity.Prediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, UUID> {

    Optional<Prediction> findByUserIdAndLeagueIdAndFixtureId(UUID userId, UUID leagueId, Long fixtureId);

    boolean existsByLeagueId(UUID leagueId);

    List<Prediction> findAllByFixtureId(Long fixtureId);

    List<Prediction> findAllByLeagueIdAndFixtureIdIn(UUID leagueId, Collection<Long> fixtureIds);

    @Query("SELECT p.userId, SUM(s.points), COUNT(DISTINCT p.fixtureId) " +
            "FROM Prediction p JOIN PredictionScore s ON s.predictionId = p.id " +
            "WHERE p.leagueId = :lid " +
            "GROUP BY p.userId")
    List<Object[]> findStandingsByLeagueId(@Param("lid") UUID leagueId);

    @Query("""
            SELECT p.userId, COALESCE(SUM(s.points), 0), COUNT(DISTINCT p.fixtureId)
            FROM Prediction p
            LEFT JOIN PredictionScore s ON s.predictionId = p.id
            WHERE p.leagueId = :leagueId
              AND p.fixtureId IN (
                  SELECT f.id FROM Fixture f
                  WHERE f.competitionId = :compId
                    AND f.seasonYear = :season
                    AND f.round = :round
              )
            GROUP BY p.userId
            """)
    List<Object[]> findGameweekStandings(
            @Param("leagueId") UUID leagueId,
            @Param("compId") Long competitionId,
            @Param("season") Integer seasonYear,
            @Param("round") String round
    );
}
