package byteblaze.backend.prediction.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.exception.LeagueNotFoundException;
import byteblaze.backend.league.repository.LeagueMembershipRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.player.entity.Player;
import byteblaze.backend.player.entity.TeamPlayer;
import byteblaze.backend.player.repository.PlayerRepository;
import byteblaze.backend.player.repository.TeamPlayerRepository;
import byteblaze.backend.prediction.dto.FixtureWithPrediction;
import byteblaze.backend.prediction.dto.GameweekFixturesResponse;
import byteblaze.backend.prediction.dto.GameweekSummaryResponse;
import byteblaze.backend.prediction.dto.MyPrediction;
import byteblaze.backend.prediction.dto.PlayerSummary;
import byteblaze.backend.prediction.dto.TeamSummary;
import byteblaze.backend.prediction.dto.UpsertPredictionRequest;
import byteblaze.backend.prediction.entity.Prediction;
import byteblaze.backend.prediction.entity.PredictionAssister;
import byteblaze.backend.prediction.entity.PredictionScorer;
import byteblaze.backend.prediction.exception.FixtureLockedException;
import byteblaze.backend.prediction.exception.FixtureNotFoundException;
import byteblaze.backend.prediction.exception.FixtureNotInLeagueException;
import byteblaze.backend.prediction.exception.NotALeagueMemberException;
import byteblaze.backend.prediction.exception.PredictionValidationException;
import byteblaze.backend.prediction.repository.PredictionAssisterRepository;
import byteblaze.backend.prediction.repository.PredictionRepository;
import byteblaze.backend.prediction.repository.PredictionScorerRepository;
import byteblaze.backend.team.entity.Team;
import byteblaze.backend.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PredictionServiceImpl implements PredictionService {

    private static final int MAX_SCORE = 20;

    private final PredictionRepository predictionRepository;
    private final PredictionScorerRepository predictionScorerRepository;
    private final PredictionAssisterRepository predictionAssisterRepository;
    private final FixtureRepository fixtureRepository;
    private final LeagueRepository leagueRepository;
    private final LeagueMembershipRepository membershipRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final TeamPlayerRepository teamPlayerRepository;

    @Override
    public List<GameweekSummaryResponse> listGameweeks(UUID leagueId, User currentUser) {
        League league = requireLeagueAndMembership(leagueId, currentUser);
        Long competitionId = league.getCompetition().getId();
        Integer seasonYear = league.getSeasonYear();

        List<Fixture> fixtures = fixtureRepository.findAllByCompetitionIdAndSeasonYear(competitionId, seasonYear);
        if (fixtures.isEmpty()) {
            return List.of();
        }

        Map<String, List<Fixture>> byRound = fixtures.stream()
                .collect(Collectors.groupingBy(Fixture::getRound, LinkedHashMap::new, Collectors.toList()));

        List<Long> allFixtureIds = fixtures.stream().map(Fixture::getId).toList();
        List<Prediction> userPredictions = predictionRepository
                .findAllByLeagueIdAndFixtureIdIn(leagueId, allFixtureIds)
                .stream()
                .filter(p -> p.getUserId().equals(currentUser.getId()))
                .toList();

        Map<Long, Long> predictionCountByFixtureId = userPredictions.stream()
                .collect(Collectors.groupingBy(Prediction::getFixtureId, Collectors.counting()));

        OffsetDateTime now = OffsetDateTime.now();

        List<GameweekSummaryResponse> result = new java.util.ArrayList<>();
        for (Map.Entry<String, List<Fixture>> entry : byRound.entrySet()) {
            String round = entry.getKey();
            List<Fixture> roundFixtures = entry.getValue();

            OffsetDateTime firstKickoffAt = roundFixtures.stream()
                    .map(Fixture::getKickoffAt)
                    .min(Comparator.naturalOrder())
                    .orElse(null);
            if (firstKickoffAt == null) {
                continue;
            }

            // Earliest still-unlocked fixture's kickoff - 15min (or null if every fixture is already locked).
            OffsetDateTime locksAt = roundFixtures.stream()
                    .map(f -> f.getKickoffAt().minusMinutes(15))
                    .filter(now::isBefore)
                    .min(Comparator.naturalOrder())
                    .orElse(null);

            int fixtureCount = roundFixtures.size();
            int userPredictionCount = roundFixtures.stream()
                    .mapToInt(f -> predictionCountByFixtureId.getOrDefault(f.getId(), 0L).intValue())
                    .sum();

            boolean allTerminal = roundFixtures.stream()
                    .allMatch(f -> f.getStatus() != null
                            && (f.getStatus().isFinal() || f.getStatus().isCancelled()));

            boolean everyFixtureLocked = roundFixtures.stream()
                    .allMatch(f -> !now.isBefore(f.getKickoffAt().minusMinutes(15)));

            String status;
            if (allTerminal) {
                status = "SETTLED";
            } else if (everyFixtureLocked) {
                status = "LOCKED";
            } else {
                status = "OPEN";
            }

            result.add(new GameweekSummaryResponse(
                    round,
                    firstKickoffAt,
                    locksAt,
                    fixtureCount,
                    userPredictionCount,
                    status
            ));
        }

        result.sort(Comparator.comparing(GameweekSummaryResponse::firstKickoffAt));
        return result;
    }

    @Override
    public GameweekFixturesResponse getGameweekFixtures(UUID leagueId, String round, User currentUser) {
        League league = requireLeagueAndMembership(leagueId, currentUser);
        Long competitionId = league.getCompetition().getId();
        Integer seasonYear = league.getSeasonYear();

        List<Fixture> fixtures = fixtureRepository
                .findAllByCompetitionIdAndSeasonYearAndRound(competitionId, seasonYear, round);
        fixtures = fixtures.stream()
                .sorted(Comparator.comparing(Fixture::getKickoffAt))
                .toList();

        if (fixtures.isEmpty()) {
            return new GameweekFixturesResponse(round, null, false, List.of());
        }

        OffsetDateTime now = OffsetDateTime.now();

        // Teams
        Set<Long> teamIds = new HashSet<>();
        for (Fixture f : fixtures) {
            if (f.getHomeTeamId() != null) teamIds.add(f.getHomeTeamId());
            if (f.getAwayTeamId() != null) teamIds.add(f.getAwayTeamId());
        }
        Map<Long, Team> teamsById = teamRepository.findAllByIdIn(teamIds).stream()
                .collect(Collectors.toMap(Team::getId, t -> t));

        // Squads for this competition+season
        List<TeamPlayer> squadMemberships = teamPlayerRepository
                .findAllByCompetitionIdAndSeasonYearAndRemovedAtIsNull(competitionId, seasonYear);
        Set<Long> playerIds = squadMemberships.stream()
                .map(TeamPlayer::getPlayerId)
                .collect(Collectors.toSet());
        Map<Long, Player> playersById = playerIds.isEmpty()
                ? Map.of()
                : playerRepository.findAllByIdIn(playerIds).stream()
                        .collect(Collectors.toMap(Player::getId, p -> p));

        Map<Long, List<PlayerSummary>> squadByTeamId = new HashMap<>();
        for (TeamPlayer tp : squadMemberships) {
            if (!teamIds.contains(tp.getTeamId())) {
                continue;
            }
            Player player = playersById.get(tp.getPlayerId());
            if (player == null) {
                continue;
            }
            squadByTeamId.computeIfAbsent(tp.getTeamId(), k -> new java.util.ArrayList<>())
                    .add(new PlayerSummary(player.getId(), player.getName(), player.getPhotoUrl(), player.getPosition()));
        }

        // User predictions for these fixtures
        List<Long> fixtureIds = fixtures.stream().map(Fixture::getId).toList();
        List<Prediction> userPredictions = predictionRepository
                .findAllByLeagueIdAndFixtureIdIn(leagueId, fixtureIds)
                .stream()
                .filter(p -> p.getUserId().equals(currentUser.getId()))
                .toList();
        Map<Long, Prediction> predictionByFixtureId = userPredictions.stream()
                .collect(Collectors.toMap(Prediction::getFixtureId, p -> p));

        List<UUID> predictionIds = userPredictions.stream().map(Prediction::getId).toList();
        Map<UUID, List<Long>> scorersByPredictionId = new HashMap<>();
        Map<UUID, List<Long>> assistersByPredictionId = new HashMap<>();
        if (!predictionIds.isEmpty()) {
            for (PredictionScorer s : predictionScorerRepository.findAllByPredictionIdIn(predictionIds)) {
                scorersByPredictionId
                        .computeIfAbsent(s.getPredictionId(), k -> new java.util.ArrayList<>())
                        .add(s.getPlayerId());
            }
            for (PredictionAssister a : predictionAssisterRepository.findAllByPredictionIdIn(predictionIds)) {
                assistersByPredictionId
                        .computeIfAbsent(a.getPredictionId(), k -> new java.util.ArrayList<>())
                        .add(a.getPlayerId());
            }
        }

        List<FixtureWithPrediction> out = new java.util.ArrayList<>(fixtures.size());
        for (Fixture f : fixtures) {
            Team homeTeam = f.getHomeTeamId() != null ? teamsById.get(f.getHomeTeamId()) : null;
            Team awayTeam = f.getAwayTeamId() != null ? teamsById.get(f.getAwayTeamId()) : null;

            TeamSummary homeSummary = homeTeam == null
                    ? new TeamSummary(f.getHomeTeamId(), null, null)
                    : new TeamSummary(homeTeam.getId(), homeTeam.getName(), homeTeam.getLogoUrl());
            TeamSummary awaySummary = awayTeam == null
                    ? new TeamSummary(f.getAwayTeamId(), null, null)
                    : new TeamSummary(awayTeam.getId(), awayTeam.getName(), awayTeam.getLogoUrl());

            List<PlayerSummary> homeSquad = f.getHomeTeamId() == null
                    ? List.of()
                    : squadByTeamId.getOrDefault(f.getHomeTeamId(), List.of());
            List<PlayerSummary> awaySquad = f.getAwayTeamId() == null
                    ? List.of()
                    : squadByTeamId.getOrDefault(f.getAwayTeamId(), List.of());

            boolean isFinal = f.getStatus() != null && f.getStatus().isFinal();
            Integer homeScore = isFinal ? f.getHomeScore() : null;
            Integer awayScore = isFinal ? f.getAwayScore() : null;

            Prediction prediction = predictionByFixtureId.get(f.getId());
            MyPrediction my = null;
            if (prediction != null) {
                my = new MyPrediction(
                        prediction.getWinnerTeamId(),
                        prediction.isPredictedDraw(),
                        prediction.getHomeScore(),
                        prediction.getAwayScore(),
                        scorersByPredictionId.getOrDefault(prediction.getId(), List.of()),
                        assistersByPredictionId.getOrDefault(prediction.getId(), List.of())
                );
            }

            OffsetDateTime fixtureLockedAt = f.getKickoffAt().minusMinutes(15);
            boolean fixtureLocked = !now.isBefore(fixtureLockedAt);

            out.add(new FixtureWithPrediction(
                    f.getId(),
                    f.getKickoffAt(),
                    f.getStatus() == null ? null : f.getStatus().apiCode(),
                    homeSummary,
                    awaySummary,
                    homeScore,
                    awayScore,
                    homeSquad,
                    awaySquad,
                    my,
                    fixtureLockedAt,
                    fixtureLocked
            ));
        }

        // Response-level locksAt = earliest pending fixture's lockedAt (or null if every fixture is locked).
        OffsetDateTime responseLocksAt = fixtures.stream()
                .map(f -> f.getKickoffAt().minusMinutes(15))
                .filter(now::isBefore)
                .min(Comparator.naturalOrder())
                .orElse(null);
        // Response-level locked is true only when every fixture in the round is locked.
        boolean responseLocked = fixtures.stream()
                .allMatch(f -> !now.isBefore(f.getKickoffAt().minusMinutes(15)));

        return new GameweekFixturesResponse(round, responseLocksAt, responseLocked, out);
    }

    @Override
    @Transactional
    public MyPrediction upsertPrediction(UUID leagueId,
                                          Long fixtureId,
                                          UpsertPredictionRequest req,
                                          User currentUser) {
        League league = requireLeagueAndMembership(leagueId, currentUser);
        Long competitionId = league.getCompetition().getId();
        Integer seasonYear = league.getSeasonYear();

        Fixture fixture = fixtureRepository.findById(fixtureId)
                .orElseThrow(() -> new FixtureNotFoundException(fixtureId));

        if (!competitionId.equals(fixture.getCompetitionId())
                || !seasonYear.equals(fixture.getSeasonYear())) {
            log.debug("Fixture {} does not belong to league {} (competition/season mismatch)", fixtureId, leagueId);
            throw new FixtureNotInLeagueException(fixtureId, leagueId);
        }

        // Per-fixture lock: each fixture locks 15 minutes before its own kickoff.
        OffsetDateTime locksAt = fixture.getKickoffAt().minusMinutes(15);
        if (!OffsetDateTime.now().isBefore(locksAt)) {
            throw new FixtureLockedException(fixture.getId(), fixture.getKickoffAt());
        }

        // Normalise lists to mutable copies, treating null as empty.
        List<Long> scorerIds = req.scorerPlayerIds() == null ? List.of() : req.scorerPlayerIds();
        List<Long> assisterIds = req.assisterPlayerIds() == null ? List.of() : req.assisterPlayerIds();

        validateRequest(req, fixture, scorerIds, assisterIds, competitionId, seasonYear);

        Optional<Prediction> existing = predictionRepository
                .findByUserIdAndLeagueIdAndFixtureId(currentUser.getId(), leagueId, fixtureId);

        Prediction prediction = existing.orElseGet(() -> Prediction.builder()
                .userId(currentUser.getId())
                .leagueId(leagueId)
                .fixtureId(fixtureId)
                .build());

        prediction.setWinnerTeamId(req.winnerTeamId());
        prediction.setPredictedDraw(req.predictedDraw());
        prediction.setHomeScore(req.homeScore());
        prediction.setAwayScore(req.awayScore());

        prediction = predictionRepository.save(prediction);
        UUID predictionId = prediction.getId();

        // Replace scorers / assisters atomically.
        predictionScorerRepository.deleteByPredictionId(predictionId);
        predictionAssisterRepository.deleteByPredictionId(predictionId);

        List<Long> distinctScorers = scorerIds.stream().distinct().toList();
        List<Long> distinctAssisters = assisterIds.stream().distinct().toList();

        if (!distinctScorers.isEmpty()) {
            List<PredictionScorer> rows = distinctScorers.stream()
                    .map(pid -> PredictionScorer.builder()
                            .predictionId(predictionId)
                            .playerId(pid)
                            .build())
                    .toList();
            predictionScorerRepository.saveAll(rows);
        }

        if (!distinctAssisters.isEmpty()) {
            List<PredictionAssister> rows = distinctAssisters.stream()
                    .map(pid -> PredictionAssister.builder()
                            .predictionId(predictionId)
                            .playerId(pid)
                            .build())
                    .toList();
            predictionAssisterRepository.saveAll(rows);
        }

        return new MyPrediction(
                prediction.getWinnerTeamId(),
                prediction.isPredictedDraw(),
                prediction.getHomeScore(),
                prediction.getAwayScore(),
                distinctScorers,
                distinctAssisters
        );
    }

    // ----------------- internals -----------------

    private League requireLeagueAndMembership(UUID leagueId, User currentUser) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        if (!membershipRepository.existsByLeagueIdAndUserId(leagueId, currentUser.getId())) {
            throw new NotALeagueMemberException(leagueId, currentUser.getId());
        }
        return league;
    }

    private void validateRequest(UpsertPredictionRequest req,
                                  Fixture fixture,
                                  List<Long> scorerIds,
                                  List<Long> assisterIds,
                                  Long competitionId,
                                  Integer seasonYear) {
        Long home = fixture.getHomeTeamId();
        Long away = fixture.getAwayTeamId();

        // Reject any scorer/assister picks when either score is missing — the caps are now
        // derived entirely from the predicted score, so picks without both scores are ambiguous.
        boolean hasScorerPicks = req.scorerPlayerIds() != null && !req.scorerPlayerIds().isEmpty();
        boolean hasAssisterPicks = req.assisterPlayerIds() != null && !req.assisterPlayerIds().isEmpty();
        if ((hasScorerPicks || hasAssisterPicks)
                && (req.homeScore() == null || req.awayScore() == null)) {
            throw new PredictionValidationException(
                    "Enter both scores before picking scorers or assisters");
        }

        if (req.winnerTeamId() != null) {
            if (!req.winnerTeamId().equals(home) && !req.winnerTeamId().equals(away)) {
                log.debug("Validation fail: winnerTeamId {} not in (home={}, away={})",
                        req.winnerTeamId(), home, away);
                throw new PredictionValidationException(
                        "winnerTeamId must match one of the teams in this fixture");
            }
            if (req.predictedDraw()) {
                log.debug("Validation fail: predictedDraw=true but winnerTeamId provided");
                throw new PredictionValidationException(
                        "Cannot set predictedDraw=true and also provide a winnerTeamId");
            }
        }

        if (req.homeScore() != null) {
            if (req.homeScore() < 0 || req.homeScore() > MAX_SCORE) {
                throw new PredictionValidationException(
                        "homeScore must be between 0 and " + MAX_SCORE);
            }
        }
        if (req.awayScore() != null) {
            if (req.awayScore() < 0 || req.awayScore() > MAX_SCORE) {
                throw new PredictionValidationException(
                        "awayScore must be between 0 and " + MAX_SCORE);
            }
        }

        boolean bothScoresPresent = req.homeScore() != null && req.awayScore() != null;
        if (bothScoresPresent) {
            if (req.predictedDraw()) {
                if (!req.homeScore().equals(req.awayScore())) {
                    log.debug("Validation fail: predictedDraw=true but scores {}:{} are not equal",
                            req.homeScore(), req.awayScore());
                    throw new PredictionValidationException(
                            "Scores must be equal when predictedDraw is true");
                }
            } else if (req.winnerTeamId() != null) {
                if (req.winnerTeamId().equals(home) && req.homeScore() <= req.awayScore()) {
                    log.debug("Validation fail: winner=home but score {}:{} not a home win",
                            req.homeScore(), req.awayScore());
                    throw new PredictionValidationException(
                            "homeScore must be greater than awayScore when home team is predicted winner");
                }
                if (req.winnerTeamId().equals(away) && req.homeScore() >= req.awayScore()) {
                    log.debug("Validation fail: winner=away but score {}:{} not an away win",
                            req.homeScore(), req.awayScore());
                    throw new PredictionValidationException(
                            "awayScore must be greater than homeScore when away team is predicted winner");
                }
            }
        }

        if (hasDuplicates(scorerIds)) {
            throw new PredictionValidationException("Duplicate player ids in scorerPlayerIds");
        }
        if (hasDuplicates(assisterIds)) {
            throw new PredictionValidationException("Duplicate player ids in assisterPlayerIds");
        }

        if (!scorerIds.isEmpty() || !assisterIds.isEmpty()) {
            Set<Long> uniquePlayers = new HashSet<>();
            uniquePlayers.addAll(scorerIds);
            uniquePlayers.addAll(assisterIds);
            List<TeamPlayer> memberships = teamPlayerRepository
                    .findAllByPlayerIdInAndCompetitionIdAndSeasonYearAndRemovedAtIsNull(
                            uniquePlayers, competitionId, seasonYear);

            Set<Long> homePlayerIds = new HashSet<>();
            Set<Long> awayPlayerIds = new HashSet<>();
            for (TeamPlayer tp : memberships) {
                if (home != null && home.equals(tp.getTeamId())) {
                    homePlayerIds.add(tp.getPlayerId());
                } else if (away != null && away.equals(tp.getTeamId())) {
                    awayPlayerIds.add(tp.getPlayerId());
                }
            }

            Set<Long> validPlayerIds = new HashSet<>();
            validPlayerIds.addAll(homePlayerIds);
            validPlayerIds.addAll(awayPlayerIds);

            for (Long pid : uniquePlayers) {
                if (!validPlayerIds.contains(pid)) {
                    log.debug("Validation fail: player {} not in either squad for (comp={}, season={})",
                            pid, competitionId, seasonYear);
                    throw new PredictionValidationException(
                            "Player " + pid + " is not in either team's squad for this fixture");
                }
            }

            // Scorer/assister count consistency with score — only enforce when BOTH scores are provided.
            if (req.homeScore() != null && req.awayScore() != null) {
                int homeScorerCount = 0;
                int awayScorerCount = 0;
                for (Long pid : scorerIds) {
                    if (homePlayerIds.contains(pid)) homeScorerCount++;
                    else if (awayPlayerIds.contains(pid)) awayScorerCount++;
                }
                if (homeScorerCount > req.homeScore()) {
                    log.debug("Validation fail: {} home scorers but homeScore={}", homeScorerCount, req.homeScore());
                    throw new PredictionValidationException(
                            "Too many home scorers — your home score is " + req.homeScore());
                }
                if (awayScorerCount > req.awayScore()) {
                    log.debug("Validation fail: {} away scorers but awayScore={}", awayScorerCount, req.awayScore());
                    throw new PredictionValidationException(
                            "Too many away scorers — your away score is " + req.awayScore());
                }

                int homeAssisterCount = 0;
                int awayAssisterCount = 0;
                for (Long pid : assisterIds) {
                    if (homePlayerIds.contains(pid)) homeAssisterCount++;
                    else if (awayPlayerIds.contains(pid)) awayAssisterCount++;
                }
                if (homeAssisterCount > req.homeScore()) {
                    log.debug("Validation fail: {} home assisters but homeScore={}", homeAssisterCount, req.homeScore());
                    throw new PredictionValidationException(
                            "Too many home assisters — your home score is " + req.homeScore());
                }
                if (awayAssisterCount > req.awayScore()) {
                    log.debug("Validation fail: {} away assisters but awayScore={}", awayAssisterCount, req.awayScore());
                    throw new PredictionValidationException(
                            "Too many away assisters — your away score is " + req.awayScore());
                }
            }
        }
    }

    private static boolean hasDuplicates(List<Long> ids) {
        return ids.stream().distinct().count() != ids.size();
    }
}
