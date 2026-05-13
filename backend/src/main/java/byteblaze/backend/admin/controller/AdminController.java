package byteblaze.backend.admin.controller;

import byteblaze.backend.admin.dto.AdminCompetitionResponse;
import byteblaze.backend.admin.dto.AdminLeagueResponse;
import byteblaze.backend.admin.dto.ApiCallLogEntry;
import byteblaze.backend.admin.dto.PatchCompetitionRequest;
import byteblaze.backend.admin.dto.PatchLeagueRequest;
import byteblaze.backend.admin.service.AdminService;
import byteblaze.backend.auth.entity.User;
import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.exception.CompetitionNotFoundException;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.league.dto.LeagueResponse;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.repository.LeagueMembershipRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.league.service.LeagueService;
import byteblaze.backend.sync.budget.ApiCallLog;
import byteblaze.backend.sync.budget.ApiCallLogRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Admin-only endpoints for platform operations:
 * competition activation, league archival, and API-Football call log inspection.
 *
 * Mapped under {@code /api/v1/admin/**} which {@code SecurityConfig} restricts
 * to {@code ROLE_ADMIN}.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private AdminService adminService;

    @GetMapping("/competitions")
    public List<AdminCompetitionResponse> listCompetitions() {
        return adminService.listCompetitions();
    }

    @PatchMapping("/competitions/{id}")
    public AdminCompetitionResponse patchCompetition(
            @PathVariable Long id,
            @Valid @RequestBody PatchCompetitionRequest patchCompetitionRequest
    ) {
       return adminService.patchCompetition(id, patchCompetitionRequest);
    }

    @GetMapping("/leagues")
    public Page<AdminLeagueResponse> listLeagues(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean archived,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return adminService.listLeagues(search, archived, page, size);
    }

    @PatchMapping("/leagues/{id}")
    public AdminLeagueResponse patchLeague(
            @PathVariable UUID id,
            @Valid @RequestBody PatchLeagueRequest body,
            @AuthenticationPrincipal User currentUser
    ) {
        return adminService.patchLeague(id, body, currentUser);
    }

    @GetMapping("/budget/log")
    public List<ApiCallLogEntry> recentLog(@RequestParam(defaultValue = "100") int limit) {
        return adminService.recentLog(limit);
    }
}
