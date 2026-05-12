package byteblaze.backend.sync.controller;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.exception.CompetitionNotFoundException;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.player.repository.TeamPlayerRepository;
import byteblaze.backend.sync.budget.ApiCallBudget;
import byteblaze.backend.sync.dto.BootstrapResult;
import byteblaze.backend.sync.dto.SyncStatusResponse;
import byteblaze.backend.sync.orchestrator.SyncOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin-only endpoints for operating the API-Football sync pipeline:
 * - Inspect budget usage and per-competition sync state
 * - Force a synchronous bootstrap of a competition (teams + upcoming fixtures + squads)
 *
 * Mapped under {@code /api/v1/admin/**} which {@code SecurityConfig} restricts
 * to {@code ROLE_ADMIN}.
 */
@RestController
@RequestMapping("/api/v1/admin/sync")
@RequiredArgsConstructor
@Slf4j
public class SyncAdminController {

    private final SyncOrchestrator orchestrator;
    private final CompetitionRepository competitionRepository;
    private final LeagueRepository leagueRepository;
    private final FixtureRepository fixtureRepository;
    private final TeamPlayerRepository teamPlayerRepository;
    private final ApiCallBudget budget;

    @GetMapping("/status")
    public SyncStatusResponse status() {
        List<Competition> active = orchestrator.activeCompetitions();

        List<SyncStatusResponse.CompetitionSyncState> states = active.stream()
                .map(c -> {
                    long leagueCount = leagueRepository.countByCompetitionId(c.getId());
                    long fixtureCount = fixtureRepository.countByCompetitionIdAndSeasonYear(
                            c.getId(), c.getSeasonYear());
                    long squadRows = teamPlayerRepository
                            .findAllByCompetitionIdAndSeasonYearAndRemovedAtIsNull(
                                    c.getId(), c.getSeasonYear())
                            .size();
                    long teamCount = teamPlayerRepository
                            .findAllByCompetitionIdAndSeasonYearAndRemovedAtIsNull(
                                    c.getId(), c.getSeasonYear())
                            .stream()
                            .map(tp -> tp.getTeamId())
                            .distinct()
                            .count();

                    return new SyncStatusResponse.CompetitionSyncState(
                            c.getId(),
                            c.getName(),
                            c.getSeasonYear(),
                            c.getLastSyncedAt(),
                            leagueCount,
                            teamCount,
                            fixtureCount,
                            squadRows
                    );
                })
                .toList();

        return new SyncStatusResponse(
                budget.getUsedLast24h(),
                budget.getDailyLimit(),
                states
        );
    }

    @PostMapping("/competitions/{id}/bootstrap")
    public BootstrapResult bootstrap(@PathVariable Long id) {
        Competition competition = competitionRepository.findById(id)
                .orElseThrow(() -> new CompetitionNotFoundException("Competition not found: " + id));

        log.info("Admin-triggered bootstrap for competition={} ({})", competition.getId(), competition.getName());
        long startedAt = System.currentTimeMillis();
        orchestrator.bootstrapCompetition(competition);
        long durationMs = System.currentTimeMillis() - startedAt;

        long fixtureCount = fixtureRepository.countByCompetitionIdAndSeasonYear(
                competition.getId(), competition.getSeasonYear());
        var squadRows = teamPlayerRepository
                .findAllByCompetitionIdAndSeasonYearAndRemovedAtIsNull(
                        competition.getId(), competition.getSeasonYear());
        long teamCount = squadRows.stream().map(tp -> tp.getTeamId()).distinct().count();

        return new BootstrapResult(
                competition.getId(),
                competition.getName(),
                competition.getSeasonYear(),
                teamCount,
                fixtureCount,
                squadRows.size(),
                budget.getUsedLast24h(),
                budget.getDailyLimit(),
                durationMs
        );
    }
}
