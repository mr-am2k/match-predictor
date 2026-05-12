package byteblaze.backend.player.repository;

import byteblaze.backend.player.entity.TeamPlayer;
import byteblaze.backend.player.entity.TeamPlayerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface TeamPlayerRepository extends JpaRepository<TeamPlayer, TeamPlayerId> {

    List<TeamPlayer> findAllByCompetitionIdAndSeasonYearAndRemovedAtIsNull(Long competitionId, Integer seasonYear);

    List<TeamPlayer> findAllByTeamIdAndSeasonYearAndCompetitionIdAndRemovedAtIsNull(Long teamId,
                                                                                    Integer seasonYear,
                                                                                    Long competitionId);

    List<TeamPlayer> findAllByPlayerIdInAndCompetitionIdAndSeasonYearAndRemovedAtIsNull(Collection<Long> playerIds,
                                                                                         Long competitionId,
                                                                                         Integer seasonYear);
}
