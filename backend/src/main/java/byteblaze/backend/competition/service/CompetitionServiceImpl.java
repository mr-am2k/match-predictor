package byteblaze.backend.competition.service;

import byteblaze.backend.competition.dto.CompetitionResponse;
import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.repository.CompetitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompetitionServiceImpl implements CompetitionService {

    private final CompetitionRepository competitionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CompetitionResponse> listActiveCompetitions() {
        return competitionRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    private CompetitionResponse toResponse(final Competition competition) {
        return CompetitionResponse.from(competition);
    }
}
