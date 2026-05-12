package byteblaze.backend.competition;

import byteblaze.backend.competition.dto.CompetitionResponse;
import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.competition.service.CompetitionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompetitionServiceImplTest {

    @Mock
    private CompetitionRepository competitionRepository;

    private CompetitionServiceImpl competitionService;

    @BeforeEach
    void setUp() {
        competitionService = new CompetitionServiceImpl(competitionRepository);
    }

    @Test
    void listActiveCompetitions_returnsMappedResponses() {
        Competition competition = buildCompetition(39L, "Premier League", true);
        when(competitionRepository.findAllByActiveTrueOrderByNameAsc())
                .thenReturn(List.of(competition));

        List<CompetitionResponse> result = competitionService.listActiveCompetitions();

        assertThat(result).hasSize(1);
        CompetitionResponse response = result.getFirst();
        assertThat(response.id()).isEqualTo(39L);
        assertThat(response.name()).isEqualTo("Premier League");
        assertThat(response.logoUrl()).isEqualTo("https://logo.com/39.png");
        assertThat(response.countryName()).isEqualTo("England");
        assertThat(response.countryFlagUrl()).isEqualTo("https://flag.com/England.png");
        assertThat(response.seasonYear()).isEqualTo(2024);
        assertThat(response.seasonStart()).isEqualTo(LocalDate.of(2024, 8, 1));
        assertThat(response.seasonEnd()).isEqualTo(LocalDate.of(2025, 5, 31));
    }

    @Test
    void listActiveCompetitions_returnsEmptyWhenNoCompetitions() {
        when(competitionRepository.findAllByActiveTrueOrderByNameAsc())
                .thenReturn(List.of());

        List<CompetitionResponse> result = competitionService.listActiveCompetitions();

        assertThat(result).isEmpty();
    }

    private Competition buildCompetition(Long id, String name, boolean isActive) {
        Competition competition = new Competition();
        competition.setId(id);
        competition.setName(name);
        competition.setLogoUrl("https://logo.com/" + id + ".png");
        competition.setCountryName("England");
        competition.setCountryFlagUrl("https://flag.com/England.png");
        competition.setSeasonYear(2024);
        competition.setSeasonStart(LocalDate.of(2024, 8, 1));
        competition.setSeasonEnd(LocalDate.of(2025, 5, 31));
        competition.setActive(isActive);
        return competition;
    }
}
