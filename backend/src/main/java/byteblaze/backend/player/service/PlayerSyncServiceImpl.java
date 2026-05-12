package byteblaze.backend.player.service;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.player.entity.Player;
import byteblaze.backend.player.entity.TeamPlayer;
import byteblaze.backend.player.repository.PlayerRepository;
import byteblaze.backend.player.repository.TeamPlayerRepository;
import byteblaze.backend.sync.budget.ApiCallBudget;
import byteblaze.backend.sync.client.ApiFootballClient;
import byteblaze.backend.sync.client.dto.SquadResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayerSyncServiceImpl implements PlayerSyncService {

    private static final String SQUAD_ENDPOINT = "/players/squads";

    private final PlayerRepository playerRepository;
    private final TeamPlayerRepository teamPlayerRepository;
    private final FixtureRepository fixtureRepository;
    private final ApiFootballClient client;
    private final ApiCallBudget budget;

    @Override
    @Transactional
    public void syncSquadForTeam(Competition competition, Long teamId) {
        Long competitionId = competition.getId();
        Integer season = competition.getSeasonYear();
        log.info("syncSquadForTeam: competition={} season={} team={}", competitionId, season, teamId);

        Optional<SquadResponse> response = client.fetchSquad(teamId);
        if (response.isEmpty() || response.get().response() == null || response.get().response().isEmpty()) {
            log.info("syncSquadForTeam: no response for team={} (budget or error)", teamId);
            return;
        }

        SquadResponse.SquadRow row = response.get().response().get(0);
        if (row == null || row.players() == null) {
            log.info("syncSquadForTeam: team={} response had no players", teamId);
            return;
        }

        Set<Long> currentPlayerIds = new LinkedHashSet<>();
        LocalDateTime now = LocalDateTime.now();
        for (SquadResponse.PlayerEntry entry : row.players()) {
            if (entry == null || entry.id() == null) {
                continue;
            }
            currentPlayerIds.add(entry.id());

            Player player = playerRepository.findById(entry.id()).orElseGet(Player::new);
            player.setId(entry.id());
            player.setName(entry.name());
            player.setPosition(entry.position());
            player.setPhotoUrl(entry.photo());
            player.setLastSyncedAt(now);
            playerRepository.save(player);
        }

        List<TeamPlayer> previousSnapshot = teamPlayerRepository
                .findAllByTeamIdAndSeasonYearAndCompetitionIdAndRemovedAtIsNull(
                        teamId, season, competitionId);
        Set<Long> previousIds = new HashSet<>();
        for (TeamPlayer tp : previousSnapshot) {
            previousIds.add(tp.getPlayerId());
        }

        int inserted = 0;
        int revived = 0;
        for (Long playerId : currentPlayerIds) {
            TeamPlayer tp = teamPlayerRepository
                    .findById(new byteblaze.backend.player.entity.TeamPlayerId(
                            teamId, playerId, season, competitionId))
                    .orElseGet(() -> {
                        TeamPlayer created = new TeamPlayer();
                        created.setTeamId(teamId);
                        created.setPlayerId(playerId);
                        created.setSeasonYear(season);
                        created.setCompetitionId(competitionId);
                        return created;
                    });
            boolean wasRemoved = tp.getRemovedAt() != null;
            if (wasRemoved) {
                revived++;
            } else if (!previousIds.contains(playerId)) {
                inserted++;
            }
            tp.setRemovedAt(null);
            teamPlayerRepository.save(tp);
        }

        int removed = 0;
        for (Long prevId : previousIds) {
            if (!currentPlayerIds.contains(prevId)) {
                TeamPlayer stale = teamPlayerRepository
                        .findById(new byteblaze.backend.player.entity.TeamPlayerId(
                                teamId, prevId, season, competitionId))
                        .orElse(null);
                if (stale != null && stale.getRemovedAt() == null) {
                    stale.setRemovedAt(now);
                    teamPlayerRepository.save(stale);
                    removed++;
                }
            }
        }

        log.info("syncSquadForTeam: team={} inserted={} revived={} removed={} total={}",
                teamId, inserted, revived, removed, currentPlayerIds.size());
    }

    @Override
    @Transactional
    public void syncSquadsForCompetition(Competition competition) {
        Long competitionId = competition.getId();
        Integer season = competition.getSeasonYear();
        log.info("syncSquadsForCompetition: competition={} season={}", competitionId, season);

        Set<Long> teamIds = collectKnownTeamIds(competitionId, season);
        if (teamIds.isEmpty()) {
            log.info("syncSquadsForCompetition: competition={} has no known teams yet; skipping", competitionId);
            return;
        }

        int synced = 0;
        for (Long teamId : teamIds) {
            if (!budget.reserve(SQUAD_ENDPOINT)) {
                log.warn("syncSquadsForCompetition: budget exhausted after {} teams; stopping for competition={}",
                        synced, competitionId);
                break;
            }
            try {
                syncSquadForTeam(competition, teamId);
                synced++;
            } catch (Exception e) {
                log.error("syncSquadsForCompetition: team={} failed: {}", teamId, e.getMessage(), e);
            }
        }

        log.info("syncSquadsForCompetition: competition={} squads-synced={}/{}",
                competitionId, synced, teamIds.size());
    }

    private Set<Long> collectKnownTeamIds(Long competitionId, Integer seasonYear) {
        Set<Long> teamIds = new LinkedHashSet<>();

        List<TeamPlayer> existing = teamPlayerRepository
                .findAllByCompetitionIdAndSeasonYearAndRemovedAtIsNull(competitionId, seasonYear);
        for (TeamPlayer tp : existing) {
            teamIds.add(tp.getTeamId());
        }

        List<Fixture> fixtures = fixtureRepository
                .findAllByCompetitionIdAndSeasonYear(competitionId, seasonYear);
        for (Fixture f : fixtures) {
            if (f.getHomeTeamId() != null) {
                teamIds.add(f.getHomeTeamId());
            }
            if (f.getAwayTeamId() != null) {
                teamIds.add(f.getAwayTeamId());
            }
        }

        return new LinkedHashSet<>(new ArrayList<>(teamIds));
    }
}
