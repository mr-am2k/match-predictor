package byteblaze.backend.prediction.repository;

import byteblaze.backend.prediction.entity.PredictionScorer;
import byteblaze.backend.prediction.entity.PredictionScorerId;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PredictionScorerRepository extends JpaRepository<PredictionScorer, PredictionScorerId> {

    List<PredictionScorer> findAllByPredictionId(UUID predictionId);

    @Modifying
    @Transactional
    void deleteByPredictionId(UUID predictionId);

    List<PredictionScorer> findAllByPredictionIdIn(Collection<UUID> predictionIds);
}
