package byteblaze.backend.overall.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.overall.dto.OverallPredictionResponse;
import byteblaze.backend.overall.dto.UpsertOverallPredictionRequest;
import byteblaze.backend.prediction.dto.PlayerSummary;
import byteblaze.backend.prediction.dto.TeamSummary;

import java.util.List;
import java.util.UUID;

public interface LeagueOverallPredictionService {

    OverallPredictionResponse get(UUID leagueId, User currentUser);

    OverallPredictionResponse upsert(UUID leagueId, UpsertOverallPredictionRequest req, User currentUser);

    List<TeamSummary> listTeams(UUID leagueId, User currentUser);

    List<PlayerSummary> listPlayers(UUID leagueId, User currentUser);
}
