package byteblaze.backend.sync.budget;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ApiCallLogRepository extends JpaRepository<ApiCallLog, UUID> {

    long countByCalledAtAfter(LocalDateTime after);

    List<ApiCallLog> findAllByOrderByCalledAtDesc(Pageable pageable);
}
