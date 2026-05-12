package byteblaze.backend.prediction.repository;

import byteblaze.backend.prediction.entity.PredictionScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PredictionScoreRepository extends JpaRepository<PredictionScore, UUID> {
}
