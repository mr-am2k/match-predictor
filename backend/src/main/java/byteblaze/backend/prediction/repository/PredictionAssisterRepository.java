package byteblaze.backend.prediction.repository;

import byteblaze.backend.prediction.entity.PredictionAssister;
import byteblaze.backend.prediction.entity.PredictionAssisterId;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PredictionAssisterRepository extends JpaRepository<PredictionAssister, PredictionAssisterId> {

    List<PredictionAssister> findAllByPredictionId(UUID predictionId);

    @Modifying
    @Transactional
    void deleteByPredictionId(UUID predictionId);

    List<PredictionAssister> findAllByPredictionIdIn(Collection<UUID> predictionIds);
}
