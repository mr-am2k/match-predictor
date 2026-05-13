package byteblaze.backend.prediction.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.prediction.dto.GameweekStandingsRowResponse;
import byteblaze.backend.prediction.dto.StandingsRowResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface StandingsService {

    Page<StandingsRowResponse> getStandings(UUID leagueId, User currentUser, Pageable pageable);

    List<GameweekStandingsRowResponse> getGameweekStandings(UUID leagueId, String round, User currentUser);
}
