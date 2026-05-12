package byteblaze.backend.overall.repository;

import byteblaze.backend.overall.entity.LeagueOverallPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeagueOverallPredictionRepository extends JpaRepository<LeagueOverallPrediction, UUID> {

    Optional<LeagueOverallPrediction> findByUserIdAndLeagueId(UUID userId, UUID leagueId);

    List<LeagueOverallPrediction> findAllByLeagueId(UUID leagueId);

    @Query("SELECT DISTINCT p.leagueId FROM LeagueOverallPrediction p " +
            "WHERE p.leagueId IN (" +
            "  SELECT l.id FROM League l " +
            "  WHERE l.competition.id = :compId AND l.seasonYear = :season" +
            ")")
    List<UUID> findLeagueIdsForCompetitionSeason(@Param("compId") Long compId,
                                                  @Param("season") Integer season);

    @Query("SELECT p.userId, s.points " +
            "FROM LeagueOverallPrediction p JOIN LeagueOverallScore s ON s.predictionId = p.id " +
            "WHERE p.leagueId = :leagueId")
    List<Object[]> findOverallScoresByLeagueId(@Param("leagueId") UUID leagueId);
}
