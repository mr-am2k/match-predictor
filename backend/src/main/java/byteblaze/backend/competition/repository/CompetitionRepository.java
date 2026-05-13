package byteblaze.backend.competition.repository;

import byteblaze.backend.competition.entity.Competition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompetitionRepository extends JpaRepository<Competition, Long> {

    List<Competition> findAllByActiveTrueOrderByNameAsc();

    @Query("SELECT c FROM Competition c " +
            "WHERE c.active = true " +
            "AND EXISTS (SELECT 1 FROM League l WHERE l.competition.id = c.id AND l.archived = false)")
    List<Competition> findActiveWithLeagues();
}
