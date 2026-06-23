package byteblaze.backend.prediction.repository;

import byteblaze.backend.prediction.entity.PredictionScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PredictionScoreRepository extends JpaRepository<PredictionScore, UUID> {

    List<PredictionScore> findAllByPredictionIdIn(Collection<UUID> predictionIds);

    void deleteByPredictionIdIn(Collection<UUID> predictionIds);
}
