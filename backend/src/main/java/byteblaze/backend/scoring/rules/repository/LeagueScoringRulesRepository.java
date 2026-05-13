package byteblaze.backend.scoring.rules.repository;

import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LeagueScoringRulesRepository extends JpaRepository<LeagueScoringRules, UUID> {
}
