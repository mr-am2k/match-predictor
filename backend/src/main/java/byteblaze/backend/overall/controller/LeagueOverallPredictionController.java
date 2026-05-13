package byteblaze.backend.overall.controller;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.overall.dto.OverallPredictionResponse;
import byteblaze.backend.overall.dto.UpsertOverallPredictionRequest;
import byteblaze.backend.overall.service.LeagueOverallPredictionService;
import byteblaze.backend.prediction.dto.PlayerSummary;
import byteblaze.backend.prediction.dto.TeamSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leagues/{leagueId}")
@RequiredArgsConstructor
public class LeagueOverallPredictionController {

    private final LeagueOverallPredictionService service;

    @GetMapping("/overall-prediction")
    public OverallPredictionResponse get(
            @PathVariable UUID leagueId,
            @AuthenticationPrincipal User user
    ) {
        return service.get(leagueId, user);
    }

    @PutMapping("/overall-prediction")
    public OverallPredictionResponse upsert(
            @PathVariable UUID leagueId,
            @RequestBody UpsertOverallPredictionRequest body,
            @AuthenticationPrincipal User user
    ) {
        return service.upsert(leagueId, body, user);
    }

    @GetMapping("/teams")
    public List<TeamSummary> teams(
            @PathVariable UUID leagueId,
            @AuthenticationPrincipal User user
    ) {
        return service.listTeams(leagueId, user);
    }

    @GetMapping("/players")
    public List<PlayerSummary> players(
            @PathVariable UUID leagueId,
            @AuthenticationPrincipal User user
    ) {
        return service.listPlayers(leagueId, user);
    }
}
