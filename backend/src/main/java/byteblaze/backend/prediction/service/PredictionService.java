package byteblaze.backend.prediction.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.prediction.dto.FixturePredictionsResponse;
import byteblaze.backend.prediction.dto.GameweekFixturesResponse;
import byteblaze.backend.prediction.dto.GameweekSummaryResponse;
import byteblaze.backend.prediction.dto.MyPrediction;
import byteblaze.backend.prediction.dto.UpsertPredictionRequest;

import java.util.List;
import java.util.UUID;

public interface PredictionService {

    List<GameweekSummaryResponse> listGameweeks(UUID leagueId, User currentUser);

    GameweekFixturesResponse getGameweekFixtures(UUID leagueId, String round, User currentUser);

    MyPrediction upsertPrediction(UUID leagueId, Long fixtureId, UpsertPredictionRequest req, User currentUser);

    FixturePredictionsResponse getFixturePredictions(UUID leagueId, Long fixtureId, User currentUser);
}
