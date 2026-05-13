package byteblaze.backend.league.repository;

import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.entity.LeagueMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface LeagueMembershipRepository extends JpaRepository<LeagueMembership, UUID> {

    boolean existsByLeagueIdAndUserId(UUID leagueId, UUID userId);

    long countByLeagueId(UUID leagueId);

    long countByLeague(League league);

    List<LeagueMembership> findByLeague(League league);

    @Query("""
            SELECT m FROM LeagueMembership m
            JOIN FETCH m.league l
            JOIN FETCH l.competition
            JOIN FETCH l.owner
            WHERE m.user.id = :userId
              AND (:includeArchived = true OR l.archived = false)
            ORDER BY m.joinedAt DESC
            """)
    List<LeagueMembership> findAllByUserIdWithLeague(
            @Param("userId") UUID userId,
            @Param("includeArchived") boolean includeArchived
    );

    @Query("""
            SELECT m FROM LeagueMembership m
            JOIN FETCH m.user
            WHERE m.league = :league
            """)
    List<LeagueMembership> findByLeagueWithUser(@Param("league") League league);

    @Query("SELECT m.league.id FROM LeagueMembership m WHERE m.user.id = :userId")
    List<UUID> findLeagueIdsByUserId(@Param("userId") UUID userId);

    @Query("""
            SELECT m.league.id, COUNT(m) FROM LeagueMembership m
            WHERE m.league.id IN :leagueIds
            GROUP BY m.league.id
            """)
    List<Object[]> countMembersByLeagueIds(@Param("leagueIds") Collection<UUID> leagueIds);
}
