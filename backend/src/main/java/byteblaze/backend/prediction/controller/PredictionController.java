package byteblaze.backend.prediction.controller;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.prediction.dto.GameweekFixturesResponse;
import byteblaze.backend.prediction.dto.GameweekSummaryResponse;
import byteblaze.backend.prediction.dto.MyPrediction;
import byteblaze.backend.prediction.dto.UpsertPredictionRequest;
import byteblaze.backend.prediction.service.PredictionService;
import jakarta.validation.Valid;
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
public class PredictionController {

    private final PredictionService predictionService;

    @GetMapping("/gameweeks")
    public List<GameweekSummaryResponse> listGameweeks(
            @PathVariable UUID leagueId,
            @AuthenticationPrincipal User currentUser
    ) {
        return predictionService.listGameweeks(leagueId, currentUser);
    }

    @GetMapping("/gameweeks/{round}/fixtures")
    public GameweekFixturesResponse getGameweekFixtures(
            @PathVariable UUID leagueId,
            @PathVariable String round,
            @AuthenticationPrincipal User currentUser
    ) {
        return predictionService.getGameweekFixtures(leagueId, round, currentUser);
    }

    @PutMapping("/fixtures/{fixtureId}/prediction")
    public MyPrediction upsertPrediction(
            @PathVariable UUID leagueId,
            @PathVariable Long fixtureId,
            @Valid @RequestBody UpsertPredictionRequest body,
            @AuthenticationPrincipal User currentUser
    ) {
        return predictionService.upsertPrediction(leagueId, fixtureId, body, currentUser);
    }
}
