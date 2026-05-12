package byteblaze.backend.competition.service;

import byteblaze.backend.competition.dto.CompetitionResponse;

import java.util.List;

public interface CompetitionService {

    List<CompetitionResponse> listActiveCompetitions();
}
