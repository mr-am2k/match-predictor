package byteblaze.backend.prediction.controller;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.prediction.dto.GameweekStandingsRowResponse;
import byteblaze.backend.prediction.dto.StandingsRowResponse;
import byteblaze.backend.prediction.service.StandingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Standings endpoint — deliberately a separate controller from the rest of
 * the predictions HTTP surface so the two parallel Phase 2 agents don't
 * contend on a single file.
 */
@RestController
@RequestMapping("/api/v1/leagues/{leagueId}")
@RequiredArgsConstructor
public class StandingsController {

    private final StandingsService standingsService;

    @GetMapping("/standings")
    public Page<StandingsRowResponse> getStandings(
            @PathVariable UUID leagueId,
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return standingsService.getStandings(leagueId, currentUser, pageable);
    }

    @GetMapping("/standings/gameweeks/{round}")
    public List<GameweekStandingsRowResponse> getGameweekStandings(
            @PathVariable UUID leagueId,
            @PathVariable String round,
            @AuthenticationPrincipal User currentUser
    ) {
        return standingsService.getGameweekStandings(leagueId, round, currentUser);
    }
}
