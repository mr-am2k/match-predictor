package byteblaze.backend.league.repository;

import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.entity.LeagueVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface LeagueRepository extends JpaRepository<League, UUID> {

    boolean existsByJoinCode(String joinCode);

    Optional<League> findByJoinCodeIgnoreCase(String joinCode);

    boolean existsByIdAndVisibility(UUID id, LeagueVisibility visibility);

    @Query("""
            SELECT l FROM League l
            WHERE l.visibility = byteblaze.backend.league.entity.LeagueVisibility.PUBLIC
              AND l.archived = false
              AND (:competitionId IS NULL OR l.competition.id = :competitionId)
              AND (CAST(:search AS string) IS NULL
                   OR LOWER(l.name) LIKE CONCAT('%', CAST(:search AS string), '%'))
            """)
    Page<League> findPublicLeagues(
            @Param("competitionId") Long competitionId,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("""
            SELECT l FROM League l
            WHERE (CAST(:search AS string) IS NULL
                   OR LOWER(l.name) LIKE CONCAT('%', CAST(:search AS string), '%'))
              AND (:archived IS NULL OR l.archived = :archived)
            """)
    Page<League> findAdminLeagues(
            @Param("search") String search,
            @Param("archived") Boolean archived,
            Pageable pageable
    );

    long countByCompetitionId(Long competitionId);

    long countByCompetitionIdAndArchivedFalse(Long competitionId);

    @Query("SELECT l FROM League l WHERE l.competition.id = :compId AND l.seasonYear = :season AND l.archived = false")
    List<League> findActiveByCompetitionAndSeason(@Param("compId") Long compId, @Param("season") Integer season);
}
