package byteblaze.backend.scoring.rules.controller;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.scoring.rules.dto.LeagueScoringRulesRequest;
import byteblaze.backend.scoring.rules.dto.LeagueScoringRulesResponse;
import byteblaze.backend.scoring.rules.service.LeagueScoringRulesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leagues/{leagueId}/scoring-rules")
@RequiredArgsConstructor
public class LeagueScoringRulesController {

    private final LeagueScoringRulesService service;

    @GetMapping
    public ResponseEntity<LeagueScoringRulesResponse> get(
            @PathVariable UUID leagueId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(service.get(leagueId, currentUser));
    }

    @PutMapping
    public ResponseEntity<LeagueScoringRulesResponse> update(
            @PathVariable UUID leagueId,
            @Valid @RequestBody LeagueScoringRulesRequest body,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(service.update(leagueId, body, currentUser));
    }
}
