package byteblaze.backend.league.controller;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.league.dto.CreateLeagueRequest;
import byteblaze.backend.league.dto.JoinLeagueByCodeRequest;
import byteblaze.backend.league.dto.JoinResult;
import byteblaze.backend.league.dto.LeagueBrowseResponse;
import byteblaze.backend.league.dto.LeagueMemberResponse;
import byteblaze.backend.league.dto.LeagueResponse;
import byteblaze.backend.league.dto.LeagueSummaryResponse;
import byteblaze.backend.league.dto.LeagueSyncResponse;
import byteblaze.backend.league.service.LeagueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leagues")
@RequiredArgsConstructor
@Slf4j
public class LeagueController {

    private final LeagueService leagueService;

    @PostMapping
    public ResponseEntity<LeagueResponse> createLeague(
            @Valid @RequestBody CreateLeagueRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        LeagueResponse response = leagueService.createLeague(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<LeagueSummaryResponse>> getMyLeagues(
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(leagueService.getLeaguesForUser(currentUser));
    }

    @GetMapping("/public")
    public ResponseEntity<Page<LeagueBrowseResponse>> browsePublic(
            @RequestParam(required = false) Long competitionId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User currentUser
    ) {
        log.info(
                "Browse public leagues competitionId={} search={} page={} size={}",
                competitionId, search, page, size
        );

        return ResponseEntity.ok(
                leagueService.browsePublicLeagues(competitionId, search, page, size, currentUser)
        );
    }

    @PostMapping("/join")
    public ResponseEntity<LeagueResponse> joinByCode(
            @Valid @RequestBody JoinLeagueByCodeRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        final JoinResult result = leagueService.joinByCode(request.code(), currentUser);

        return ResponseEntity
                .status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.league());
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<LeagueResponse> joinPublic(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        final JoinResult result = leagueService.joinPublic(id, currentUser);

        return ResponseEntity
                .status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.league());
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<LeagueMemberResponse>> listMembers(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(leagueService.listMembers(id, currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeagueResponse> getLeague(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(leagueService.getLeague(id, currentUser));
    }

    @PostMapping("/{id}/sync")
    public ResponseEntity<LeagueSyncResponse> triggerSync(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(leagueService.triggerSync(id, currentUser));
    }
}
