package byteblaze.backend.league;

import byteblaze.backend.auth.entity.Role;
import byteblaze.backend.auth.entity.User;
import byteblaze.backend.auth.filter.JwtAuthenticationFilter;
import byteblaze.backend.league.controller.LeagueController;
import byteblaze.backend.league.dto.CompetitionSummary;
import byteblaze.backend.league.dto.LeagueResponse;
import byteblaze.backend.league.dto.LeagueSummaryResponse;
import byteblaze.backend.league.dto.OwnerSummary;
import byteblaze.backend.league.entity.LeagueVisibility;
import byteblaze.backend.league.entity.MembershipRole;
import byteblaze.backend.league.service.LeagueService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LeagueController.class)
@Import(LeagueControllerTest.TestSecurityConfig.class)
class LeagueControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LeagueService leagueService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private User authUser;

    @BeforeEach
    void setUp() {
        authUser = User.builder()
                .id(UUID.randomUUID())
                .email("me@test.com")
                .password("pwd")
                .username("me")
                .role(Role.USER)
                .build();
    }

    @Test
    @WithAnonymousUser
    void createLeague_returns401WhenUnauthenticated() throws Exception {
        String body = """
                {"name":"Valid Name","visibility":"PUBLIC","competitionId":1}
                """;

        mockMvc.perform(post("/api/v1/leagues")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createLeague_returnsValidationError_whenNameBlank() throws Exception {
        String body = """
                {"name":"","visibility":"PUBLIC","competitionId":1}
                """;

        mockMvc.perform(post("/api/v1/leagues")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createLeague_returnsValidationError_whenMissingCompetitionId() throws Exception {
        String body = """
                {"name":"My League","visibility":"PRIVATE"}
                """;

        mockMvc.perform(post("/api/v1/leagues")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createLeague_returns201WithLeagueResponse() throws Exception {
        LeagueResponse response = new LeagueResponse(
                UUID.randomUUID(),
                "My League",
                LeagueVisibility.PRIVATE,
                "A7K9X2",
                new CompetitionSummary(1L, "Premier League", "logo", "England", "flag", 2024),
                new OwnerSummary(authUser.getId(), authUser.getUsername()),
                1L,
                LocalDateTime.now()
        );
        when(leagueService.createLeague(any(), any())).thenReturn(response);

        String body = """
                {"name":"My League","visibility":"PRIVATE","competitionId":1}
                """;

        mockMvc.perform(post("/api/v1/leagues")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("My League"))
                .andExpect(jsonPath("$.joinCode").value("A7K9X2"))
                .andExpect(jsonPath("$.competition.id").value(1));
    }

    @Test
    void getMyLeagues_returnsList() throws Exception {
        UUID leagueId = UUID.randomUUID();
        LeagueSummaryResponse summary = new LeagueSummaryResponse(
                leagueId,
                "My League",
                LeagueVisibility.PUBLIC,
                new CompetitionSummary(1L, "Premier League", "logo", "England", "flag", 2024),
                MembershipRole.OWNER,
                1L
        );
        when(leagueService.getLeaguesForUser(any())).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/v1/leagues/me")
                        .with(SecurityMockMvcRequestPostProcessors.user(authUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(leagueId.toString()))
                .andExpect(jsonPath("$[0].role").value("OWNER"));
    }

    @Test
    @WithAnonymousUser
    void getMyLeagues_returns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/leagues/me"))
                .andExpect(status().isUnauthorized());
    }

    @org.springframework.boot.test.context.TestConfiguration
    static class TestSecurityConfig {

        @org.springframework.context.annotation.Bean
        org.springframework.security.web.SecurityFilterChain testSecurityFilterChain(
                org.springframework.security.config.annotation.web.builders.HttpSecurity http) throws Exception {
            http
                    .csrf(org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(ex -> ex
                            .authenticationEntryPoint((request, response, authException) ->
                                    response.setStatus(401))
                    );
            return http.build();
        }
    }
}
