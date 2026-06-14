package byteblaze.backend.fixture.repository;

import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface FixtureRepository extends JpaRepository<Fixture, Long> {

    List<Fixture> findAllByCompetitionIdAndSeasonYear(Long competitionId, Integer seasonYear);

    List<Fixture> findAllByCompetitionIdAndSeasonYearAndRound(Long competitionId, Integer seasonYear, String round);

    @Query("SELECT f.round FROM Fixture f " +
            "WHERE f.competitionId = :competitionId AND f.seasonYear = :seasonYear " +
            "GROUP BY f.round ORDER BY MIN(f.kickoffAt)")
    List<String> findDistinctRoundsOrdered(@Param("competitionId") Long competitionId,
                                            @Param("seasonYear") Integer seasonYear);

    List<Fixture> findAllByCompetitionIdAndKickoffAtBetween(Long competitionId,
                                                             OffsetDateTime from,
                                                             OffsetDateTime to);

    @Query("SELECT COUNT(f) FROM Fixture f " +
            "WHERE f.competitionId = :cid AND f.status IN :statuses AND f.kickoffAt BETWEEN :from AND :to")
    long countInWindow(@Param("cid") Long competitionId,
                        @Param("statuses") Collection<FixtureStatus> statuses,
                        @Param("from") OffsetDateTime from,
                        @Param("to") OffsetDateTime to);

    List<Fixture> findAllByIdIn(Collection<Long> ids);

    long countByCompetitionIdAndSeasonYear(Long competitionId, Integer seasonYear);

    long countByCompetitionIdAndStatusIn(Long competitionId, Collection<FixtureStatus> statuses);

    List<Fixture> findByCompetitionIdAndSeasonYearAndStatusInAndSettledAtIsNull(
            Long competitionId, Integer seasonYear, Collection<FixtureStatus> statuses);

    long countByCompetitionIdAndSeasonYearAndStatusIn(Long competitionId,
                                                      Integer seasonYear,
                                                      Collection<FixtureStatus> statuses);
}
