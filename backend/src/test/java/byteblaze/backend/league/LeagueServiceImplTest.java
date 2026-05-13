package byteblaze.backend.league;

import byteblaze.backend.auth.entity.Role;
import byteblaze.backend.auth.entity.User;
import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.exception.CompetitionInactiveException;
import byteblaze.backend.competition.exception.CompetitionNotFoundException;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.league.dto.CreateLeagueRequest;
import byteblaze.backend.league.dto.LeagueResponse;
import byteblaze.backend.league.dto.LeagueSummaryResponse;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.entity.LeagueMembership;
import byteblaze.backend.league.entity.LeagueVisibility;
import byteblaze.backend.league.entity.MembershipRole;
import byteblaze.backend.league.exception.JoinCodeGenerationException;
import byteblaze.backend.league.exception.LeagueAccessDeniedException;
import byteblaze.backend.league.exception.LeagueNotFoundException;
import byteblaze.backend.league.repository.LeagueMembershipRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.league.service.JoinCodeGenerator;
import byteblaze.backend.league.service.LeagueServiceImpl;
import byteblaze.backend.scoring.rules.service.LeagueScoringRulesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeagueServiceImplTest {

    @Mock
    private LeagueRepository leagueRepository;

    @Mock
    private LeagueMembershipRepository membershipRepository;

    @Mock
    private CompetitionRepository competitionRepository;

    @Mock
    private JoinCodeGenerator joinCodeGenerator;

    @Mock
    private LeagueScoringRulesService scoringRulesService;

    @Captor
    private ArgumentCaptor<League> leagueCaptor;

    @Captor
    private ArgumentCaptor<LeagueMembership> membershipCaptor;

    @InjectMocks
    private LeagueServiceImpl leagueService;

    private User owner;
    private User otherUser;
    private Competition competition;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(UUID.randomUUID())
                .email("owner@test.com")
                .password("pwd")
                .username("owner")
                .role(Role.USER)
                .build();

        otherUser = User.builder()
                .id(UUID.randomUUID())
                .email("other@test.com")
                .password("pwd")
                .username("other")
                .role(Role.USER)
                .build();

        competition = new Competition();
        competition.setId(39L);
        competition.setName("Premier League");
        competition.setLogoUrl("https://logo.com/39.png");
        competition.setCountryName("England");
        competition.setCountryFlagUrl("https://flag.com/England.png");
        competition.setSeasonYear(2024);
        competition.setSeasonStart(LocalDate.of(2024, 8, 1));
        competition.setSeasonEnd(LocalDate.of(2025, 5, 31));
        competition.setActive(true);
    }

    @Test
    void createLeague_privateLeague_generatesJoinCodeAndCreatesOwnerMembership() {
        CreateLeagueRequest request = new CreateLeagueRequest(
                "Friends Pool", LeagueVisibility.PRIVATE, 39L, null);

        when(competitionRepository.findById(39L)).thenReturn(Optional.of(competition));
        when(joinCodeGenerator.generate()).thenReturn("A7K9X2");
        when(leagueRepository.existsByJoinCode("A7K9X2")).thenReturn(false);
        when(leagueRepository.save(any(League.class))).thenAnswer(invocation -> {
            League saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });

        LeagueResponse response = leagueService.createLeague(request, owner);

        verify(leagueRepository).save(leagueCaptor.capture());
        League saved = leagueCaptor.getValue();
        assertThat(saved.getName()).isEqualTo("Friends Pool");
        assertThat(saved.getVisibility()).isEqualTo(LeagueVisibility.PRIVATE);
        assertThat(saved.getJoinCode()).isEqualTo("A7K9X2");
        assertThat(saved.getCompetition()).isSameAs(competition);
        assertThat(saved.getSeasonYear()).isEqualTo(2024);
        assertThat(saved.getOwner()).isSameAs(owner);

        verify(membershipRepository).save(membershipCaptor.capture());
        LeagueMembership membership = membershipCaptor.getValue();
        assertThat(membership.getRole()).isEqualTo(MembershipRole.OWNER);
        assertThat(membership.getUser()).isSameAs(owner);
        assertThat(membership.getLeague()).isSameAs(saved);

        assertThat(response.joinCode()).isEqualTo("A7K9X2");
        assertThat(response.memberCount()).isEqualTo(1L);
        assertThat(response.owner().id()).isEqualTo(owner.getId());
    }

    @Test
    void createLeague_publicLeague_doesNotGenerateJoinCode() {
        CreateLeagueRequest request = new CreateLeagueRequest(
                "Public Pool", LeagueVisibility.PUBLIC, 39L, null);

        when(competitionRepository.findById(39L)).thenReturn(Optional.of(competition));
        when(leagueRepository.save(any(League.class))).thenAnswer(invocation -> {
            League saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });

        LeagueResponse response = leagueService.createLeague(request, owner);

        verify(joinCodeGenerator, never()).generate();
        verify(leagueRepository).save(leagueCaptor.capture());
        assertThat(leagueCaptor.getValue().getJoinCode()).isNull();
        assertThat(response.joinCode()).isNull();
    }

    @Test
    void createLeague_trimsName() {
        CreateLeagueRequest request = new CreateLeagueRequest(
                "  Trimmed Name  ", LeagueVisibility.PUBLIC, 39L, null);

        when(competitionRepository.findById(39L)).thenReturn(Optional.of(competition));
        when(leagueRepository.save(any(League.class))).thenAnswer(invocation -> {
            League saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });

        leagueService.createLeague(request, owner);

        verify(leagueRepository).save(leagueCaptor.capture());
        assertThat(leagueCaptor.getValue().getName()).isEqualTo("Trimmed Name");
    }

    @Test
    void createLeague_unknownCompetition_throwsCompetitionNotFound() {
        CreateLeagueRequest request = new CreateLeagueRequest(
                "Pool", LeagueVisibility.PUBLIC, 999L, null);

        when(competitionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leagueService.createLeague(request, owner))
                .isInstanceOf(CompetitionNotFoundException.class);

        verify(leagueRepository, never()).save(any());
        verify(membershipRepository, never()).save(any());
    }

    @Test
    void createLeague_inactiveCompetition_throwsCompetitionInactive() {
        competition.setActive(false);
        CreateLeagueRequest request = new CreateLeagueRequest(
                "Pool", LeagueVisibility.PUBLIC, 39L, null);

        when(competitionRepository.findById(39L)).thenReturn(Optional.of(competition));

        assertThatThrownBy(() -> leagueService.createLeague(request, owner))
                .isInstanceOf(CompetitionInactiveException.class);

        verify(leagueRepository, never()).save(any());
    }

    @Test
    void createLeague_retriesOnJoinCodeCollision() {
        CreateLeagueRequest request = new CreateLeagueRequest(
                "Pool", LeagueVisibility.PRIVATE, 39L, null);

        when(competitionRepository.findById(39L)).thenReturn(Optional.of(competition));
        when(joinCodeGenerator.generate()).thenReturn("COLLIDE", "UNIQUE");
        when(leagueRepository.existsByJoinCode("COLLIDE")).thenReturn(true);
        when(leagueRepository.existsByJoinCode("UNIQUE")).thenReturn(false);
        when(leagueRepository.save(any(League.class))).thenAnswer(invocation -> {
            League saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        LeagueResponse response = leagueService.createLeague(request, owner);

        assertThat(response.joinCode()).isEqualTo("UNIQUE");
    }

    @Test
    void createLeague_throwsWhenAllJoinCodesCollide() {
        CreateLeagueRequest request = new CreateLeagueRequest(
                "Pool", LeagueVisibility.PRIVATE, 39L, null);

        when(competitionRepository.findById(39L)).thenReturn(Optional.of(competition));
        when(joinCodeGenerator.generate()).thenReturn("DUPE");
        when(leagueRepository.existsByJoinCode("DUPE")).thenReturn(true);

        assertThatThrownBy(() -> leagueService.createLeague(request, owner))
                .isInstanceOf(JoinCodeGenerationException.class);

        verify(leagueRepository, never()).save(any());
    }

    @Test
    void getLeague_publicLeague_accessibleByNonMember() {
        UUID leagueId = UUID.randomUUID();
        League league = buildLeague(leagueId, LeagueVisibility.PUBLIC, null);

        when(leagueRepository.findById(leagueId)).thenReturn(Optional.of(league));
        when(membershipRepository.existsByLeagueIdAndUserId(leagueId, otherUser.getId())).thenReturn(false);
        when(membershipRepository.countByLeagueId(leagueId)).thenReturn(3L);

        LeagueResponse response = leagueService.getLeague(leagueId, otherUser);

        assertThat(response.id()).isEqualTo(leagueId);
        assertThat(response.memberCount()).isEqualTo(3L);
        assertThat(response.joinCode()).isNull();
    }

    @Test
    void getLeague_privateLeague_forbidsNonMember() {
        UUID leagueId = UUID.randomUUID();
        League league = buildLeague(leagueId, LeagueVisibility.PRIVATE, "SECRET");

        when(leagueRepository.findById(leagueId)).thenReturn(Optional.of(league));
        when(membershipRepository.existsByLeagueIdAndUserId(leagueId, otherUser.getId())).thenReturn(false);

        assertThatThrownBy(() -> leagueService.getLeague(leagueId, otherUser))
                .isInstanceOf(LeagueAccessDeniedException.class);
    }

    @Test
    void getLeague_privateLeague_hidesJoinCodeFromNonOwnerMember() {
        UUID leagueId = UUID.randomUUID();
        League league = buildLeague(leagueId, LeagueVisibility.PRIVATE, "SECRET");

        when(leagueRepository.findById(leagueId)).thenReturn(Optional.of(league));
        when(membershipRepository.existsByLeagueIdAndUserId(leagueId, otherUser.getId())).thenReturn(true);
        when(membershipRepository.countByLeagueId(leagueId)).thenReturn(2L);

        LeagueResponse response = leagueService.getLeague(leagueId, otherUser);

        assertThat(response.joinCode()).isNull();
    }

    @Test
    void getLeague_privateLeague_showsJoinCodeToOwner() {
        UUID leagueId = UUID.randomUUID();
        League league = buildLeague(leagueId, LeagueVisibility.PRIVATE, "SECRET");

        when(leagueRepository.findById(leagueId)).thenReturn(Optional.of(league));
        when(membershipRepository.existsByLeagueIdAndUserId(leagueId, owner.getId())).thenReturn(true);
        when(membershipRepository.countByLeagueId(leagueId)).thenReturn(1L);

        LeagueResponse response = leagueService.getLeague(leagueId, owner);

        assertThat(response.joinCode()).isEqualTo("SECRET");
    }

    @Test
    void getLeague_unknownLeague_throwsLeagueNotFound() {
        UUID leagueId = UUID.randomUUID();
        when(leagueRepository.findById(leagueId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leagueService.getLeague(leagueId, owner))
                .isInstanceOf(LeagueNotFoundException.class);
    }

    @Test
    void getLeaguesForUser_returnsOnlyCallerLeagues() {
        UUID leagueId = UUID.randomUUID();
        League league = buildLeague(leagueId, LeagueVisibility.PUBLIC, null);

        LeagueMembership membership = LeagueMembership.builder()
                .id(UUID.randomUUID())
                .league(league)
                .user(owner)
                .role(MembershipRole.OWNER)
                .build();

        when(membershipRepository.findAllByUserIdWithLeague(owner.getId(), false)).thenReturn(List.of(membership));
        when(membershipRepository.countByLeagueId(leagueId)).thenReturn(4L);

        List<LeagueSummaryResponse> result = leagueService.getLeaguesForUser(owner);

        assertThat(result).hasSize(1);
        LeagueSummaryResponse summary = result.getFirst();
        assertThat(summary.id()).isEqualTo(leagueId);
        assertThat(summary.role()).isEqualTo(MembershipRole.OWNER);
        assertThat(summary.memberCount()).isEqualTo(4L);
        assertThat(summary.competition().id()).isEqualTo(39L);
    }

    private League buildLeague(UUID leagueId, LeagueVisibility visibility, String joinCode) {
        return League.builder()
                .id(leagueId)
                .name("Test League")
                .visibility(visibility)
                .joinCode(joinCode)
                .competition(competition)
                .seasonYear(competition.getSeasonYear())
                .owner(owner)
                .createdAt(LocalDateTime.now())
                .build();
    }
}
