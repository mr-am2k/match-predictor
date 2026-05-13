package byteblaze.backend.overall.repository;

import byteblaze.backend.overall.entity.LeagueOverallScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LeagueOverallScoreRepository extends JpaRepository<LeagueOverallScore, UUID> {

    @Query("SELECT COALESCE(SUM(s.points), 0) FROM LeagueOverallScore s " +
            "WHERE s.predictionId IN (" +
            "  SELECT p.id FROM LeagueOverallPrediction p " +
            "  WHERE p.userId = :userId AND p.leagueId = :leagueId" +
            ")")
    int totalForUserInLeague(@Param("userId") UUID userId, @Param("leagueId") UUID leagueId);
}
