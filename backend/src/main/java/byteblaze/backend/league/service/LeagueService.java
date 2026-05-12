package byteblaze.backend.league.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.league.dto.CreateLeagueRequest;
import byteblaze.backend.league.dto.JoinResult;
import byteblaze.backend.league.dto.LeagueBrowseResponse;
import byteblaze.backend.league.dto.LeagueMemberResponse;
import byteblaze.backend.league.dto.LeagueResponse;
import byteblaze.backend.league.dto.LeagueSummaryResponse;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface LeagueService {

    LeagueResponse createLeague(CreateLeagueRequest request, User currentUser);

    LeagueResponse getLeague(UUID leagueId, User currentUser);

    List<LeagueSummaryResponse> getLeaguesForUser(User currentUser);

    List<LeagueSummaryResponse> getLeaguesForUser(User currentUser, boolean includeArchived);

    JoinResult joinByCode(String code, User currentUser);

    JoinResult joinPublic(UUID leagueId, User currentUser);

    Page<LeagueBrowseResponse> browsePublicLeagues(
            Long competitionId,
            String search,
            int page,
            int size,
            User currentUser
    );

    List<LeagueMemberResponse> listMembers(UUID leagueId, User currentUser);

    LeagueResponse archive(UUID leagueId, boolean archived, User currentUser);
}
