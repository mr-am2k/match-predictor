package byteblaze.backend.admin.service;

import byteblaze.backend.admin.dto.*;
import byteblaze.backend.auth.entity.User;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface AdminService {
    List<AdminCompetitionResponse> listCompetitions();

    AdminCompetitionResponse patchCompetition(final Long id, final PatchCompetitionRequest patchCompetitionRequest);

    Page<AdminLeagueResponse> listLeagues(
            final String search,
            final Boolean archived,
            final int page,
            final int size
    );

    AdminLeagueResponse patchLeague(
            final UUID id,
            final PatchLeagueRequest body,
            final User currentUser
    );

    List<ApiCallLogEntry> recentLog(final int limit);
}
