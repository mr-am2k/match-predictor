package byteblaze.backend.competition;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.any;

@ExtendWith(MockitoExtension.class)
class CompetitionSyncServiceImplTest {

    @Mock
    private CompetitionRepository competitionRepository;

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.RequestHeadersUriSpec<?> requestHeadersUriSpec;

    @Mock
    private RestClient.RequestHeadersSpec<?> requestHeadersSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @Captor
    private ArgumentCaptor<List<Competition>> competitionsCaptor;

    private CompetitionSyncServiceImpl competitionSyncService;

    private static final List<Long> WHITELISTED_IDS = List.of(39L, 140L, 78L);

    @BeforeEach
    void setUp() {
        competitionSyncService = new CompetitionSyncServiceImpl(
                competitionRepository,
                restClient,
                WHITELISTED_IDS
        );
    }

    /**
     * Verifies that competitions fetched from the API are saved to the repository.
     */
    @Test
    void sync_shouldSaveCompetitionsFromApi() {
        final ApiFootballLeagueResponse response = createApiResponse(List.of(
                createLeagueEntry(39L, "Premier League", "England", true),
                createLeagueEntry(140L, "La Liga", "Spain", true)
        ));
        setupRestClientMock(response);
        when(competitionRepository.findById(any())).thenReturn(Optional.empty());

        competitionSyncService.sync();

        verify(competitionRepository).saveAll(competitionsCaptor.capture());
        final List<Competition> savedCompetitions = competitionsCaptor.getValue();

        assertThat(savedCompetitions).hasSize(2);
        assertThat(savedCompetitions)
                .extracting(Competition::getName)
                .containsExactlyInAnyOrder("Premier League", "La Liga");
    }

    /**
     * Verifies that only competitions with whitelisted IDs are synced.
     */
    @Test
    void sync_shouldFilterByWhitelistedIds() {
        final ApiFootballLeagueResponse response = createApiResponse(List.of(
                createLeagueEntry(39L, "Premier League", "England", true),
                createLeagueEntry(999L, "Unknown League", "Unknown", true)
        ));
        setupRestClientMock(response);
        when(competitionRepository.findById(any())).thenReturn(Optional.empty());

        competitionSyncService.sync();

        verify(competitionRepository).saveAll(competitionsCaptor.capture());
        final List<Competition> savedCompetitions = competitionsCaptor.getValue();

        assertThat(savedCompetitions).hasSize(1);
        assertThat(savedCompetitions.getFirst().getName()).isEqualTo("Premier League");
    }

    /**
     * Verifies that existing competitions are updated rather than duplicated.
     */
    @Test
    void sync_shouldUpdateExistingCompetition() {
        Competition existingCompetition = new Competition();
        existingCompetition.setId(39L);
        existingCompetition.setName("Old Name");

        final ApiFootballLeagueResponse response = createApiResponse(List.of(
                createLeagueEntry(39L, "Premier League", "England", true)
        ));
        setupRestClientMock(response);
        when(competitionRepository.findById(39L)).thenReturn(Optional.of(existingCompetition));

        competitionSyncService.sync();

        verify(competitionRepository).saveAll(competitionsCaptor.capture());
        final List<Competition> savedCompetitions = competitionsCaptor.getValue();

        assertThat(savedCompetitions).hasSize(1);
        assertThat(savedCompetitions.getFirst().getName()).isEqualTo("Premier League");
        assertThat(savedCompetitions.getFirst()).isSameAs(existingCompetition);
    }

    /**
     * Verifies that all fields from the API response are correctly mapped to the Competition entity.
     */
    @Test
    void sync_shouldMapAllFieldsCorrectly() {
        final ApiFootballLeagueResponse response = createApiResponse(List.of(
                createLeagueEntry(39L, "Premier League", "England", true)
        ));
        setupRestClientMock(response);
        when(competitionRepository.findById(any())).thenReturn(Optional.empty());

        competitionSyncService.sync();

        verify(competitionRepository).saveAll(competitionsCaptor.capture());
        final Competition saved = competitionsCaptor.getValue().getFirst();

        assertThat(saved.getId()).isEqualTo(39L);
        assertThat(saved.getName()).isEqualTo("Premier League");
        assertThat(saved.getType()).isEqualTo("League");
        assertThat(saved.getLogoUrl()).isEqualTo("https://logo.com/39.png");
        assertThat(saved.getCountryName()).isEqualTo("England");
        assertThat(saved.getCountryFlagUrl()).isEqualTo("https://flag.com/England.png");
        assertThat(saved.getSeasonYear()).isEqualTo(2024);
        assertThat(saved.getSeasonStart()).isEqualTo(LocalDate.of(2024, 8, 1));
        assertThat(saved.getSeasonEnd()).isEqualTo(LocalDate.of(2025, 5, 31));
        assertThat(saved.getLastSyncedAt()).isNotNull();
    }

    /**
     * Verifies that a null API response is handled gracefully without saving.
     */
    @Test
    void sync_shouldHandleNullResponse() {
        setupRestClientMock(null);

        competitionSyncService.sync();

        verify(competitionRepository, never()).saveAll(any());
    }

    /**
     * Verifies that a response with null league list is handled gracefully without saving.
     */
    @Test
    void sync_shouldHandleNullResponseList() {
        ApiFootballLeagueResponse response = new ApiFootballLeagueResponse(null);
        setupRestClientMock(response);

        competitionSyncService.sync();

        verify(competitionRepository, never()).saveAll(any());
    }

    /**
     * Verifies that an empty league list results in saving an empty collection.
     */
    @Test
    void sync_shouldHandleEmptyResponse() {
        ApiFootballLeagueResponse response = createApiResponse(List.of());
        setupRestClientMock(response);

        competitionSyncService.sync();

        verify(competitionRepository).saveAll(competitionsCaptor.capture());
        assertThat(competitionsCaptor.getValue()).isEmpty();
    }

    /**
     * Verifies that an exception is thrown when a league has no current season.
     */
    @Test
    void sync_shouldThrowWhenNoCurrentSeason() {
        ApiFootballLeagueResponse response = createApiResponse(List.of(
                createLeagueEntry(39L, "Premier League", "England", false)
        ));
        setupRestClientMock(response);

        assertThatThrownBy(() -> competitionSyncService.sync())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No current season found for league: 39");
    }

    @SuppressWarnings("unchecked")
    private void setupRestClientMock(ApiFootballLeagueResponse response) {
        doReturn(requestHeadersUriSpec).when(restClient).get();
        doReturn(requestHeadersSpec).when(requestHeadersUriSpec).uri(eq("/leagues?current=true"));
        doReturn(responseSpec).when(requestHeadersSpec).retrieve();
        doReturn(response).when(responseSpec).body(ApiFootballLeagueResponse.class);
    }

    private ApiFootballLeagueResponse createApiResponse(List<ApiFootballLeagueResponse.LeagueEntry> entries) {
        return new ApiFootballLeagueResponse(entries);
    }

    private ApiFootballLeagueResponse.LeagueEntry createLeagueEntry(
            Long id, String name, String country, boolean currentSeason) {
        return new ApiFootballLeagueResponse.LeagueEntry(
                new ApiFootballLeagueResponse.League(id, name, "League", "https://logo.com/" + id + ".png"),
                new ApiFootballLeagueResponse.Country(country, "https://flag.com/" + country + ".png"),
                List.of(new ApiFootballLeagueResponse.Season(2024, "2024-08-01", "2025-05-31", currentSeason))
        );
    }
}
