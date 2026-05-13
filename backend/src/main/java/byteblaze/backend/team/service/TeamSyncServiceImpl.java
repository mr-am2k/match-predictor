package byteblaze.backend.team.service;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.sync.client.ApiFootballClient;
import byteblaze.backend.sync.client.dto.TeamsResponse;
import byteblaze.backend.team.entity.Team;
import byteblaze.backend.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamSyncServiceImpl implements TeamSyncService {

    private final TeamRepository teamRepository;
    private final ApiFootballClient client;

    @Override
    @Transactional
    public void syncTeams(Competition competition) {
        Long competitionId = competition.getId();
        Integer season = competition.getSeasonYear();
        log.info("syncTeams: competition={} season={}", competitionId, season);

        Optional<TeamsResponse> response = client.fetchTeams(competitionId, season);
        if (response.isEmpty() || response.get().response() == null) {
            log.info("syncTeams: no response for competition={} (budget or error)", competitionId);
            return;
        }

        int count = 0;
        for (TeamsResponse.TeamRow row : response.get().response()) {
            if (row == null || row.team() == null || row.team().id() == null) {
                continue;
            }
            TeamsResponse.TeamInfo info = row.team();
            Team team = teamRepository.findById(info.id()).orElseGet(Team::new);
            team.setId(info.id());
            team.setName(info.name());
            team.setCode(info.code());
            team.setCountry(info.country());
            team.setLogoUrl(info.logo());
            team.setLastSyncedAt(LocalDateTime.now());
            teamRepository.save(team);
            count++;
        }

        log.info("syncTeams: competition={} upserted={} teams", competitionId, count);
    }

    @Override
    @Transactional
    public void ensureTeamStub(Long teamId, String name, String logoUrl) {
        if (teamId == null) {
            return;
        }
        if (teamRepository.existsById(teamId)) {
            return;
        }
        Team stub = new Team();
        stub.setId(teamId);
        stub.setName(name != null ? name : "Team " + teamId);
        stub.setLogoUrl(logoUrl);
        stub.setLastSyncedAt(LocalDateTime.now());
        teamRepository.save(stub);
        log.debug("ensureTeamStub: inserted stub for team={}", teamId);
    }
}
