package byteblaze.backend.overall.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.exception.LeagueNotFoundException;
import byteblaze.backend.league.repository.LeagueMembershipRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.overall.dto.OverallPredictionResponse;
import byteblaze.backend.overall.dto.UpsertOverallPredictionRequest;
import byteblaze.backend.overall.entity.LeagueOverallPrediction;
import byteblaze.backend.overall.exception.OverallPredictionLockedException;
import byteblaze.backend.overall.repository.LeagueOverallPredictionRepository;
import byteblaze.backend.player.entity.Player;
import byteblaze.backend.player.entity.TeamPlayer;
import byteblaze.backend.player.repository.PlayerRepository;
import byteblaze.backend.player.repository.TeamPlayerRepository;
import byteblaze.backend.prediction.dto.PlayerSummary;
import byteblaze.backend.prediction.dto.TeamSummary;
import byteblaze.backend.prediction.exception.NotALeagueMemberException;
import byteblaze.backend.prediction.exception.PredictionValidationException;
import byteblaze.backend.team.entity.Team;
import byteblaze.backend.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeagueOverallPredictionServiceImpl implements LeagueOverallPredictionService {

    private final LeagueRepository leagueRepository;
    private final LeagueMembershipRepository membershipRepository;
    private final LeagueOverallPredictionRepository overallRepository;
    private final FixtureRepository fixtureRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final TeamPlayerRepository teamPlayerRepository;

    @Override
    public OverallPredictionResponse get(UUID leagueId, User currentUser) {
        League league = requireLeagueAndMembership(leagueId, currentUser);
        LocalDate locksAt = resolveLocksAt(league);
        boolean locked = isLocked(locksAt);

        Optional<LeagueOverallPrediction> existing =
                overallRepository.findByUserIdAndLeagueId(currentUser.getId(), leagueId);

        return existing
                .map(p -> new OverallPredictionResponse(
                        p.getId(),
                        p.getWinnerTeamId(),
                        p.getTopScorerPlayerId(),
                        p.getTopAssisterPlayerId(),
                        locksAt,
                        locked
                ))
                .orElseGet(() -> new OverallPredictionResponse(
                        null, null, null, null, locksAt, locked
                ));
    }

    @Override
    @Transactional
    public OverallPredictionResponse upsert(UUID leagueId,
                                            UpsertOverallPredictionRequest req,
                                            User currentUser) {
        League league = requireLeagueAndMembership(leagueId, currentUser);
        LocalDate locksAt = resolveLocksAt(league);
        if (isLocked(locksAt)) {
            log.debug("Overall prediction locked for league={} (locksAt={})", leagueId, locksAt);
            throw new OverallPredictionLockedException(leagueId, locksAt);
        }

        Long competitionId = league.getCompetition().getId();
        Integer seasonYear = league.getSeasonYear();

        validateSelections(req, competitionId, seasonYear);

        LeagueOverallPrediction prediction = overallRepository
                .findByUserIdAndLeagueId(currentUser.getId(), leagueId)
                .orElseGet(() -> LeagueOverallPrediction.builder()
                        .userId(currentUser.getId())
                        .leagueId(leagueId)
                        .build());

        prediction.setWinnerTeamId(req.winnerTeamId());
        prediction.setTopScorerPlayerId(req.topScorerPlayerId());
        prediction.setTopAssisterPlayerId(req.topAssisterPlayerId());

        prediction = overallRepository.save(prediction);

        return new OverallPredictionResponse(
                prediction.getId(),
                prediction.getWinnerTeamId(),
                prediction.getTopScorerPlayerId(),
                prediction.getTopAssisterPlayerId(),
                locksAt,
                false
        );
    }

    @Override
    public List<TeamSummary> listTeams(UUID leagueId, User currentUser) {
        League league = requireLeagueAndMembership(leagueId, currentUser);
        Long competitionId = league.getCompetition().getId();
        Integer seasonYear = league.getSeasonYear();

        Set<Long> teamIds = collectTeamIds(competitionId, seasonYear);
        if (teamIds.isEmpty()) {
            return List.of();
        }

        return teamRepository.findAllByIdIn(teamIds).stream()
                .map(t -> new TeamSummary(t.getId(), t.getName(), t.getLogoUrl()))
                .sorted(Comparator.comparing(
                        TeamSummary::name,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    @Override
    public List<PlayerSummary> listPlayers(UUID leagueId, User currentUser) {
        League league = requireLeagueAndMembership(leagueId, currentUser);
        Long competitionId = league.getCompetition().getId();
        Integer seasonYear = league.getSeasonYear();

        List<TeamPlayer> squads = teamPlayerRepository
                .findAllByCompetitionIdAndSeasonYearAndRemovedAtIsNull(competitionId, seasonYear);
        Set<Long> playerIds = new HashSet<>();
        for (TeamPlayer tp : squads) {
            playerIds.add(tp.getPlayerId());
        }
        if (playerIds.isEmpty()) {
            return List.of();
        }

        return playerRepository.findAllByIdIn(playerIds).stream()
                .map(p -> new PlayerSummary(p.getId(), p.getName(), p.getPhotoUrl(), p.getPosition()))
                .sorted(Comparator.comparing(
                        PlayerSummary::name,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    // ----------------- internals -----------------

    private League requireLeagueAndMembership(UUID leagueId, User currentUser) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        if (currentUser == null
                || !membershipRepository.existsByLeagueIdAndUserId(leagueId, currentUser.getId())) {
            throw new NotALeagueMemberException(leagueId, currentUser == null ? null : currentUser.getId());
        }
        return league;
    }

    private LocalDate resolveLocksAt(League league) {
        Competition competition = league.getCompetition();
        return competition == null ? null : competition.getSeasonStart();
    }

    private boolean isLocked(LocalDate locksAt) {
        if (locksAt == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        return today.isAfter(locksAt) || today.isEqual(locksAt);
    }

    private Set<Long> collectTeamIds(Long competitionId, Integer seasonYear) {
        Set<Long> teamIds = new HashSet<>();
        for (Fixture f : fixtureRepository.findAllByCompetitionIdAndSeasonYear(competitionId, seasonYear)) {
            if (f.getHomeTeamId() != null) teamIds.add(f.getHomeTeamId());
            if (f.getAwayTeamId() != null) teamIds.add(f.getAwayTeamId());
        }
        if (teamIds.isEmpty()) {
            // Fallback: derive from current squad rows.
            for (TeamPlayer tp : teamPlayerRepository
                    .findAllByCompetitionIdAndSeasonYearAndRemovedAtIsNull(competitionId, seasonYear)) {
                if (tp.getTeamId() != null) teamIds.add(tp.getTeamId());
            }
        }
        return teamIds;
    }

    private void validateSelections(UpsertOverallPredictionRequest req,
                                     Long competitionId,
                                     Integer seasonYear) {
        if (req.winnerTeamId() != null) {
            Set<Long> teamIds = collectTeamIds(competitionId, seasonYear);
            if (!teamIds.contains(req.winnerTeamId())) {
                throw new PredictionValidationException(
                        "winnerTeamId " + req.winnerTeamId()
                                + " is not a team in this competition/season");
            }
        }

        Set<Long> requestedPlayers = new HashSet<>();
        if (req.topScorerPlayerId() != null) requestedPlayers.add(req.topScorerPlayerId());
        if (req.topAssisterPlayerId() != null) requestedPlayers.add(req.topAssisterPlayerId());
        if (requestedPlayers.isEmpty()) {
            return;
        }

        List<TeamPlayer> matches = teamPlayerRepository
                .findAllByPlayerIdInAndCompetitionIdAndSeasonYearAndRemovedAtIsNull(
                        requestedPlayers, competitionId, seasonYear);
        Set<Long> validPlayerIds = new HashSet<>();
        for (TeamPlayer tp : matches) {
            validPlayerIds.add(tp.getPlayerId());
        }

        if (req.topScorerPlayerId() != null && !validPlayerIds.contains(req.topScorerPlayerId())) {
            throw new PredictionValidationException(
                    "topScorerPlayerId " + req.topScorerPlayerId()
                            + " is not in a current squad for this competition/season");
        }
        if (req.topAssisterPlayerId() != null && !validPlayerIds.contains(req.topAssisterPlayerId())) {
            throw new PredictionValidationException(
                    "topAssisterPlayerId " + req.topAssisterPlayerId()
                            + " is not in a current squad for this competition/season");
        }
    }
}
