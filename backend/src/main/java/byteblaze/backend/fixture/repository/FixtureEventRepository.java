package byteblaze.backend.fixture.repository;

import byteblaze.backend.fixture.entity.FixtureEvent;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FixtureEventRepository extends JpaRepository<FixtureEvent, UUID> {

    List<FixtureEvent> findAllByFixtureId(Long fixtureId);

    @Modifying
    @Transactional
    void deleteByFixtureId(Long fixtureId);
}
