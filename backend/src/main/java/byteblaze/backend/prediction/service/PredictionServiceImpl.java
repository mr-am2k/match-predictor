package byteblaze.backend.prediction.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.auth.repository.UserRepository;
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
import byteblaze.backend.prediction.dto.FixturePredictionsResponse;
import byteblaze.backend.prediction.dto.FixtureWithPrediction;
import byteblaze.backend.prediction.dto.GameweekFixturesResponse;
import byteblaze.backend.prediction.dto.GameweekSummaryResponse;
import byteblaze.backend.prediction.dto.MyPrediction;
import byteblaze.backend.prediction.dto.OtherPrediction;
import byteblaze.backend.prediction.dto.PlayerPick;
import byteblaze.backend.prediction.dto.PlayerPickView;
import byteblaze.backend.prediction.dto.PlayerSummary;
import byteblaze.backend.prediction.dto.ScoreBreakdown;
import byteblaze.backend.prediction.dto.ScoreLine;
import byteblaze.backend.prediction.dto.TeamSummary;
import byteblaze.backend.prediction.dto.UpsertPredictionRequest;
import byteblaze.backend.prediction.entity.Prediction;
import byteblaze.backend.prediction.entity.PredictionAssister;
import byteblaze.backend.prediction.entity.PredictionScore;
import byteblaze.backend.prediction.entity.PredictionScorer;
import byteblaze.backend.prediction.exception.FixtureLockedException;
import byteblaze.backend.prediction.exception.FixtureNotFoundException;
import byteblaze.backend.prediction.exception.FixtureNotInLeagueException;
import byteblaze.backend.prediction.exception.NotALeagueMemberException;
import byteblaze.backend.prediction.exception.PredictionValidationException;
import byteblaze.backend.prediction.repository.PredictionAssisterRepository;
import byteblaze.backend.prediction.repository.PredictionRepository;
import byteblaze.backend.prediction.repository.PredictionScoreRepository;
import byteblaze.backend.prediction.repository.PredictionScorerRepository;
import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;
import byteblaze.backend.scoring.rules.repository.LeagueScoringRulesRepository;
import byteblaze.backend.team.entity.Team;
import byteblaze.backend.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

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
    private final PredictionScoreRepository predictionScoreRepository;
    private final LeagueScoringRulesRepository leagueScoringRulesRepository;
    private final UserRepository userRepository;
    private final FixtureRepository fixtureRepository;
    private final LeagueRepository leagueRepository;
    private final LeagueMembershipRepository membershipRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final TeamPlayerRepository teamPlayerRepository;
    private final ObjectMapper objectMapper;

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
        boolean assistersEnabled = assistersEnabled(leagueId);

        List<Fixture> fixtures = fixtureRepository
                .findAllByCompetitionIdAndSeasonYearAndRound(competitionId, seasonYear, round);
        fixtures = fixtures.stream()
                .sorted(Comparator.comparing(Fixture::getKickoffAt))
                .toList();

        if (fixtures.isEmpty()) {
            return new GameweekFixturesResponse(round, null, false, assistersEnabled, List.of());
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
        Map<UUID, List<PlayerPick>> scorersByPredictionId = new HashMap<>();
        Map<UUID, List<PlayerPick>> assistersByPredictionId = new HashMap<>();
        if (!predictionIds.isEmpty()) {
            for (PredictionScorer s : predictionScorerRepository.findAllByPredictionIdIn(predictionIds)) {
                scorersByPredictionId
                        .computeIfAbsent(s.getPredictionId(), k -> new java.util.ArrayList<>())
                        .add(new PlayerPick(s.getPlayerId(), s.getCount()));
            }
            for (PredictionAssister a : predictionAssisterRepository.findAllByPredictionIdIn(predictionIds)) {
                assistersByPredictionId
                        .computeIfAbsent(a.getPredictionId(), k -> new java.util.ArrayList<>())
                        .add(new PlayerPick(a.getPlayerId(), a.getCount()));
            }
        }

        // Scores (present only for settled fixtures) + player names for breakdown lines.
        Map<UUID, PredictionScore> scoreByPredictionId = predictionIds.isEmpty()
                ? Map.of()
                : predictionScoreRepository.findAllByPredictionIdIn(predictionIds).stream()
                        .collect(Collectors.toMap(PredictionScore::getPredictionId, s -> s));
        Map<Long, String> playerNameById = new HashMap<>();
        playersById.forEach((pid, player) -> playerNameById.put(pid, player.getName()));

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
                PredictionScore scoreRow = scoreByPredictionId.get(prediction.getId());
                Integer points = scoreRow == null ? null : scoreRow.getPoints();
                ScoreBreakdown breakdown = scoreRow == null
                        ? null
                        : parseBreakdown(scoreRow.getBreakdown(), playerNameById);
                my = new MyPrediction(
                        prediction.getWinnerTeamId(),
                        prediction.isPredictedDraw(),
                        prediction.getHomeScore(),
                        prediction.getAwayScore(),
                        scorersByPredictionId.getOrDefault(prediction.getId(), List.of()),
                        assistersByPredictionId.getOrDefault(prediction.getId(), List.of()),
                        points,
                        breakdown
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

        return new GameweekFixturesResponse(round, responseLocksAt, responseLocked, assistersEnabled, out);
    }

    @Override
    public FixturePredictionsResponse getFixturePredictions(UUID leagueId, Long fixtureId, User currentUser) {
        League league = requireLeagueAndMembership(leagueId, currentUser);
        Long competitionId = league.getCompetition().getId();
        Integer seasonYear = league.getSeasonYear();

        Fixture fixture = fixtureRepository.findById(fixtureId)
                .orElseThrow(() -> new FixtureNotFoundException(fixtureId));
        if (!competitionId.equals(fixture.getCompetitionId())
                || !seasonYear.equals(fixture.getSeasonYear())) {
            throw new FixtureNotInLeagueException(fixtureId, leagueId);
        }

        OffsetDateTime lockedAt = fixture.getKickoffAt().minusMinutes(15);
        boolean locked = !OffsetDateTime.now().isBefore(lockedAt);

        int memberCount = (int) membershipRepository.countByLeagueId(leagueId);

        List<Prediction> predictions = predictionRepository
                .findAllByLeagueIdAndFixtureId(leagueId, fixtureId);
        int predictionCount = predictions.size();

        // Predictions stay hidden until the fixture locks (kickoff - 15m). We still
        // return the counts so the UI can tease how many members have already picked.
        if (!locked || predictions.isEmpty()) {
            return new FixturePredictionsResponse(
                    fixtureId, locked, lockedAt, memberCount, predictionCount, List.of());
        }

        List<UUID> predictionIds = predictions.stream().map(Prediction::getId).toList();

        Set<UUID> userIds = predictions.stream().map(Prediction::getUserId).collect(Collectors.toSet());
        Map<UUID, String> usernameById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));

        Map<UUID, List<PredictionScorer>> scorersByPrediction = predictionScorerRepository
                .findAllByPredictionIdIn(predictionIds).stream()
                .collect(Collectors.groupingBy(PredictionScorer::getPredictionId));
        Map<UUID, List<PredictionAssister>> assistersByPrediction = predictionAssisterRepository
                .findAllByPredictionIdIn(predictionIds).stream()
                .collect(Collectors.groupingBy(PredictionAssister::getPredictionId));

        Set<Long> playerIds = new HashSet<>();
        scorersByPrediction.values().forEach(list -> list.forEach(s -> playerIds.add(s.getPlayerId())));
        assistersByPrediction.values().forEach(list -> list.forEach(a -> playerIds.add(a.getPlayerId())));
        Map<Long, String> playerNameById = playerIds.isEmpty()
                ? Map.of()
                : playerRepository.findAllByIdIn(playerIds).stream()
                        .collect(Collectors.toMap(Player::getId, Player::getName));

        // scores present only once the prediction has been scored (fixture settled)
        Map<UUID, PredictionScore> scoreByPrediction = predictionScoreRepository
                .findAllByPredictionIdIn(predictionIds).stream()
                .collect(Collectors.toMap(PredictionScore::getPredictionId, s -> s));

        UUID currentUserId = currentUser.getId();
        List<OtherPrediction> rows = new java.util.ArrayList<>(predictions.size());
        for (Prediction p : predictions) {
            List<PlayerPickView> scorers = scorersByPrediction.getOrDefault(p.getId(), List.of()).stream()
                    .map(s -> new PlayerPickView(
                            s.getPlayerId(),
                            playerNameById.getOrDefault(s.getPlayerId(), "Player #" + s.getPlayerId()),
                            s.getCount()))
                    .toList();
            List<PlayerPickView> assisters = assistersByPrediction.getOrDefault(p.getId(), List.of()).stream()
                    .map(a -> new PlayerPickView(
                            a.getPlayerId(),
                            playerNameById.getOrDefault(a.getPlayerId(), "Player #" + a.getPlayerId()),
                            a.getCount()))
                    .toList();

            PredictionScore scoreRow = scoreByPrediction.get(p.getId());
            Integer points = scoreRow == null ? null : scoreRow.getPoints();
            ScoreBreakdown breakdown = scoreRow == null
                    ? null
                    : parseBreakdown(scoreRow.getBreakdown(), playerNameById);

            rows.add(new OtherPrediction(
                    p.getUserId(),
                    usernameById.getOrDefault(p.getUserId(), "Unknown"),
                    p.getUserId().equals(currentUserId),
                    p.getWinnerTeamId(),
                    p.isPredictedDraw(),
                    p.getHomeScore(),
                    p.getAwayScore(),
                    scorers,
                    assisters,
                    points,
                    breakdown
            ));
        }

        // Current user first, then points desc (unscored last), then username.
        rows.sort(Comparator
                .comparingInt((OtherPrediction o) -> o.isCurrentUser() ? 0 : 1)
                .thenComparingInt(o -> o.points() == null ? Integer.MAX_VALUE : -o.points())
                .thenComparing(o -> o.username() == null ? "" : o.username().toLowerCase()));

        return new FixturePredictionsResponse(
                fixtureId, true, lockedAt, memberCount, predictionCount, rows);
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

        // Normalise lists to mutable copies, treating null as empty. When the
        // league has per-match assisters disabled we ignore any incoming
        // assisters entirely (tolerant of older clients) rather than 400ing.
        boolean assistersEnabled = assistersEnabled(leagueId);
        List<PlayerPick> scorers = req.scorers() == null ? List.of() : req.scorers();
        List<PlayerPick> assisters = (!assistersEnabled || req.assisters() == null)
                ? List.of()
                : req.assisters();

        validateRequest(req, fixture, scorers, assisters, competitionId, seasonYear);

        Optional<Prediction> existing = predictionRepository
                .findByUserIdAndLeagueIdAndFixtureId(currentUser.getId(), leagueId, fixtureId);

        Prediction prediction = existing.orElseGet(() -> Prediction.builder()
                .userId(currentUser.getId())
                .leagueId(leagueId)
                .fixtureId(fixtureId)
                .build());

        // Derive the winner/draw from the score when the caller left it unset.
        // A score fully determines the outcome, so a prediction of "2-1" with no
        // explicit pick should still count as a home-win prediction — and stays in
        // sync whenever the score is updated.
        Long winnerTeamId = req.winnerTeamId();
        boolean predictedDraw = req.predictedDraw();
        if (winnerTeamId == null && !predictedDraw
                && req.homeScore() != null && req.awayScore() != null) {
            int homeScore = req.homeScore();
            int awayScore = req.awayScore();
            if (homeScore > awayScore) {
                winnerTeamId = fixture.getHomeTeamId();
            } else if (awayScore > homeScore) {
                winnerTeamId = fixture.getAwayTeamId();
            } else {
                predictedDraw = true;
            }
        }

        prediction.setWinnerTeamId(winnerTeamId);
        prediction.setPredictedDraw(predictedDraw);
        prediction.setHomeScore(req.homeScore());
        prediction.setAwayScore(req.awayScore());

        prediction = predictionRepository.save(prediction);
        UUID predictionId = prediction.getId();

        // Replace scorers atomically. Assisters are only touched when the league
        // has them enabled — when disabled we leave any existing assister rows
        // intact so re-enabling the toggle restores the member's earlier picks.
        predictionScorerRepository.deleteByPredictionId(predictionId);
        if (assistersEnabled) {
            predictionAssisterRepository.deleteByPredictionId(predictionId);
        }

        if (!scorers.isEmpty()) {
            List<PredictionScorer> rows = scorers.stream()
                    .map(pick -> PredictionScorer.builder()
                            .predictionId(predictionId)
                            .playerId(pick.playerId())
                            .count(pick.count())
                            .build())
                    .toList();
            predictionScorerRepository.saveAll(rows);
        }

        if (assistersEnabled && !assisters.isEmpty()) {
            List<PredictionAssister> rows = assisters.stream()
                    .map(pick -> PredictionAssister.builder()
                            .predictionId(predictionId)
                            .playerId(pick.playerId())
                            .count(pick.count())
                            .build())
                    .toList();
            predictionAssisterRepository.saveAll(rows);
        }

        return new MyPrediction(
                prediction.getWinnerTeamId(),
                prediction.isPredictedDraw(),
                prediction.getHomeScore(),
                prediction.getAwayScore(),
                scorers,
                assisters,
                null,
                null
        );
    }

    // ----------------- internals -----------------

    /**
     * Whether per-match assisters are enabled for this league (V13 toggle).
     * Defaults to {@code true} if the rules row is somehow missing, matching the
     * column default and pre-toggle behaviour.
     */
    private boolean assistersEnabled(UUID leagueId) {
        return leagueScoringRulesRepository.findById(leagueId)
                .map(LeagueScoringRules::isAssistersEnabled)
                .orElse(true);
    }

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
                                  List<PlayerPick> scorers,
                                  List<PlayerPick> assisters,
                                  Long competitionId,
                                  Integer seasonYear) {
        Long home = fixture.getHomeTeamId();
        Long away = fixture.getAwayTeamId();

        // Reject any scorer/assister picks when either score is missing — the caps are now
        // derived entirely from the predicted score, so picks without both scores are ambiguous.
        // Keyed on the normalised lists: when assisters are disabled the list is already empty.
        boolean hasScorerPicks = !scorers.isEmpty();
        boolean hasAssisterPicks = !assisters.isEmpty();
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

        // Belt-and-suspenders: bean validation covers these, but guard against direct service callers.
        for (PlayerPick pick : scorers) {
            if (pick == null || pick.playerId() == null || pick.count() == null || pick.count() < 1) {
                throw new PredictionValidationException("Invalid scorer pick");
            }
        }
        for (PlayerPick pick : assisters) {
            if (pick == null || pick.playerId() == null || pick.count() == null || pick.count() < 1) {
                throw new PredictionValidationException("Invalid assister pick");
            }
        }

        if (hasDuplicatePlayerIds(scorers)) {
            throw new PredictionValidationException("Duplicate player ids in scorers");
        }
        if (hasDuplicatePlayerIds(assisters)) {
            throw new PredictionValidationException("Duplicate player ids in assisters");
        }

        if (!scorers.isEmpty() || !assisters.isEmpty()) {
            Set<Long> uniquePlayers = new HashSet<>();
            for (PlayerPick p : scorers) uniquePlayers.add(p.playerId());
            for (PlayerPick p : assisters) uniquePlayers.add(p.playerId());
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
                int homeScorerCount = scorers.stream()
                        .filter(p -> homePlayerIds.contains(p.playerId()))
                        .mapToInt(PlayerPick::count)
                        .sum();
                int awayScorerCount = scorers.stream()
                        .filter(p -> awayPlayerIds.contains(p.playerId()))
                        .mapToInt(PlayerPick::count)
                        .sum();
                if (homeScorerCount > req.homeScore()) {
                    log.debug("Validation fail: home scorer total {} but homeScore={}", homeScorerCount, req.homeScore());
                    throw new PredictionValidationException(
                            "Too many home scorers — your home score is " + req.homeScore());
                }
                if (awayScorerCount > req.awayScore()) {
                    log.debug("Validation fail: away scorer total {} but awayScore={}", awayScorerCount, req.awayScore());
                    throw new PredictionValidationException(
                            "Too many away scorers — your away score is " + req.awayScore());
                }

                int homeAssisterCount = assisters.stream()
                        .filter(p -> homePlayerIds.contains(p.playerId()))
                        .mapToInt(PlayerPick::count)
                        .sum();
                int awayAssisterCount = assisters.stream()
                        .filter(p -> awayPlayerIds.contains(p.playerId()))
                        .mapToInt(PlayerPick::count)
                        .sum();
                if (homeAssisterCount > req.homeScore()) {
                    log.debug("Validation fail: home assister total {} but homeScore={}", homeAssisterCount, req.homeScore());
                    throw new PredictionValidationException(
                            "Too many home assisters — your home score is " + req.homeScore());
                }
                if (awayAssisterCount > req.awayScore()) {
                    log.debug("Validation fail: away assister total {} but awayScore={}", awayAssisterCount, req.awayScore());
                    throw new PredictionValidationException(
                            "Too many away assisters — your away score is " + req.awayScore());
                }
            }
        }
    }

    private static boolean hasDuplicatePlayerIds(List<PlayerPick> picks) {
        return picks.stream().map(PlayerPick::playerId).distinct().count() != picks.size();
    }

    /**
     * Parse the stored {@code prediction_scores.breakdown} JSON into a typed,
     * name-resolved {@link ScoreBreakdown}. Returns null for breakdowns without a
     * {@code total} field (cancelled/skipped fixtures or serialization failures).
     */
    private ScoreBreakdown parseBreakdown(String json, Map<Long, String> nameById) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            if (!root.has("total")) {
                return null;
            }
            return new ScoreBreakdown(
                    root.path("winner").asInt(0),
                    root.path("score").asInt(0),
                    parseScoreLines(root.path("scorers"), nameById),
                    parseScoreLines(root.path("assisters"), nameById),
                    root.path("categoriesHit").asInt(0),
                    root.path("baseTotal").asInt(0),
                    root.path("multiplier").asDouble(1.0),
                    root.path("total").asInt(0)
            );
        } catch (RuntimeException e) {
            log.warn("Failed to parse scoring breakdown: {}", e.getMessage());
            return null;
        }
    }

    private static List<ScoreLine> parseScoreLines(JsonNode array, Map<Long, String> nameById) {
        if (array == null || !array.isArray() || array.isEmpty()) {
            return List.of();
        }
        List<ScoreLine> lines = new java.util.ArrayList<>(array.size());
        for (JsonNode node : array) {
            Long playerId = node.path("playerId").asLong();
            lines.add(new ScoreLine(
                    playerId,
                    nameById.getOrDefault(playerId, "Player #" + playerId),
                    node.path("predicted").asInt(0),
                    node.path("actual").asInt(0),
                    node.path("correct").asBoolean(false),
                    node.path("points").asInt(0)
            ));
        }
        return lines;
    }
}
