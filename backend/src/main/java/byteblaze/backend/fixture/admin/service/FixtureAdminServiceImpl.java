package byteblaze.backend.fixture.admin.service;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.exception.CompetitionNotFoundException;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.fixture.admin.dto.AdminFixtureDetail;
import byteblaze.backend.fixture.admin.dto.AdminFixtureSummary;
import byteblaze.backend.fixture.admin.dto.EditFixtureResultRequest;
import byteblaze.backend.fixture.admin.dto.EditFixtureResultResponse;
import byteblaze.backend.fixture.admin.dto.EventLine;
import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.fixture.entity.FixtureEventType;
import byteblaze.backend.fixture.entity.FixtureStatus;
import byteblaze.backend.fixture.repository.FixtureEventRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.overall.service.OverallSeasonScoringService;
import byteblaze.backend.player.entity.Player;
import byteblaze.backend.player.entity.TeamPlayer;
import byteblaze.backend.player.repository.PlayerRepository;
import byteblaze.backend.player.repository.TeamPlayerRepository;
import byteblaze.backend.prediction.dto.PlayerSummary;
import byteblaze.backend.prediction.dto.TeamSummary;
import byteblaze.backend.prediction.exception.FixtureNotFoundException;
import byteblaze.backend.prediction.exception.PredictionValidationException;
import byteblaze.backend.prediction.service.FixtureScoringService;
import byteblaze.backend.team.entity.Team;
import byteblaze.backend.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FixtureAdminServiceImpl implements FixtureAdminService {

    private static final String OWN_GOAL_DETAIL = "Own Goal";

    /** Statuses meaning a fixture has NOT reached a terminal (final/cancelled) state. */
    private static final Set<FixtureStatus> UNFINISHED_STATUSES;

    static {
        EnumSet<FixtureStatus> unfinished = EnumSet.allOf(FixtureStatus.class);
        unfinished.removeAll(FixtureStatus.FINAL);
        unfinished.removeAll(FixtureStatus.CANCELLED);
        UNFINISHED_STATUSES = unfinished;
    }

    private final CompetitionRepository competitionRepository;
    private final FixtureRepository fixtureRepository;
    private final FixtureEventRepository fixtureEventRepository;
    private final TeamRepository teamRepository;
    private final TeamPlayerRepository teamPlayerRepository;
    private final PlayerRepository playerRepository;
    private final FixtureScoringService fixtureScoringService;
    private final OverallSeasonScoringService overallSeasonScoringService;

    @Override
    @Transactional(readOnly = true)
    public List<String> listRounds(Long competitionId) {
        Competition competition = competition(competitionId);
        return fixtureRepository.findDistinctRoundsOrdered(competition.getId(), competition.getSeasonYear());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminFixtureSummary> listFixtures(Long competitionId, String round) {
        Competition competition = competition(competitionId);

        List<Fixture> fixtures = (round == null || round.isBlank())
                ? fixtureRepository.findAllByCompetitionIdAndSeasonYear(competition.getId(), competition.getSeasonYear())
                : fixtureRepository.findAllByCompetitionIdAndSeasonYearAndRound(
                        competition.getId(), competition.getSeasonYear(), round);

        Map<Long, Team> teamsById = teamsFor(fixtures);

        return fixtures.stream()
                .sorted(Comparator.comparing(Fixture::getKickoffAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(f -> new AdminFixtureSummary(
                        f.getId(),
                        f.getRound(),
                        f.getKickoffAt(),
                        f.getStatus() != null ? f.getStatus().name() : null,
                        teamSummary(f.getHomeTeamId(), teamsById),
                        teamSummary(f.getAwayTeamId(), teamsById),
                        f.getHomeScore(),
                        f.getAwayScore(),
                        f.isManuallyOverridden()
                ))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminFixtureDetail getFixture(Long fixtureId) {
        Fixture f = fixtureRepository.findById(fixtureId)
                .orElseThrow(() -> new FixtureNotFoundException(fixtureId));

        Map<Long, Team> teamsById = teamsFor(List.of(f));

        List<PlayerSummary> homeRoster = roster(f.getHomeTeamId(), f.getSeasonYear(), f.getCompetitionId());
        List<PlayerSummary> awayRoster = roster(f.getAwayTeamId(), f.getSeasonYear(), f.getCompetitionId());

        List<FixtureEvent> events = fixtureEventRepository.findAllByFixtureId(fixtureId);

        // Player names for the event lines (rosters cover most; fall back to a direct lookup).
        Set<Long> eventPlayerIds = events.stream().map(FixtureEvent::getPlayerId).collect(Collectors.toSet());
        Map<Long, String> playerNames = eventPlayerIds.isEmpty()
                ? Map.of()
                : playerRepository.findAllByIdIn(eventPlayerIds).stream()
                        .collect(Collectors.toMap(Player::getId, Player::getName));

        List<EventLine> scorers = aggregateGoals(events, playerNames);
        List<EventLine> assisters = aggregateAssists(events, playerNames);

        return new AdminFixtureDetail(
                f.getId(),
                f.getCompetitionId(),
                f.getSeasonYear(),
                f.getRound(),
                f.getKickoffAt(),
                f.getStatus() != null ? f.getStatus().name() : null,
                teamSummary(f.getHomeTeamId(), teamsById),
                teamSummary(f.getAwayTeamId(), teamsById),
                f.getHomeScore(),
                f.getAwayScore(),
                f.isManuallyOverridden(),
                homeRoster,
                awayRoster,
                scorers,
                assisters
        );
    }

    @Override
    @Transactional
    public EditFixtureResultResponse editResult(Long fixtureId, EditFixtureResultRequest request) {
        Fixture fixture = fixtureRepository.findById(fixtureId)
                .orElseThrow(() -> new FixtureNotFoundException(fixtureId));

        List<EditFixtureResultRequest.ScorerInput> scorers =
                request.scorers() != null ? request.scorers() : List.of();
        List<EditFixtureResultRequest.AssisterInput> assisters =
                request.assisters() != null ? request.assisters() : List.of();

        validate(fixture, scorers, assisters);

        FixtureStatus status = request.status() != null ? request.status() : FixtureStatus.FT;

        fixture.setHomeScore(request.homeScore());
        fixture.setAwayScore(request.awayScore());
        fixture.setStatus(status);
        fixture.setWinnerTeamId(resolveWinnerTeamId(fixture, request.homeScore(), request.awayScore(), status));
        fixture.setManuallyOverridden(true);
        fixtureRepository.save(fixture);

        // Replace the fixture's events with the admin-specified goals/assists.
        fixtureEventRepository.deleteByFixtureId(fixtureId);
        List<FixtureEvent> toInsert = new ArrayList<>();
        for (EditFixtureResultRequest.ScorerInput s : scorers) {
            boolean ownGoal = Boolean.TRUE.equals(s.ownGoal());
            for (int i = 0; i < s.goals(); i++) {
                toInsert.add(FixtureEvent.builder()
                        .fixtureId(fixtureId)
                        .playerId(s.playerId())
                        .teamId(s.teamId())
                        .type(FixtureEventType.GOAL)
                        .detail(ownGoal ? OWN_GOAL_DETAIL : null)
                        .build());
            }
        }
        for (EditFixtureResultRequest.AssisterInput a : assisters) {
            for (int i = 0; i < a.assists(); i++) {
                toInsert.add(FixtureEvent.builder()
                        .fixtureId(fixtureId)
                        .playerId(a.playerId())
                        .teamId(a.teamId())
                        .type(FixtureEventType.ASSIST)
                        .build());
            }
        }
        if (!toInsert.isEmpty()) {
            fixtureEventRepository.saveAll(toInsert);
        }

        // Recalculate per-match prediction scores for this fixture.
        int predictionsRescored = fixtureScoringService.scoreFixture(fixtureId, true);

        // If the whole season is finished, the edit may change the season winner /
        // top scorer / top assister, so recompute the overall predictions too.
        boolean overallRescored = false;
        long unfinished = fixtureRepository.countByCompetitionIdAndSeasonYearAndStatusIn(
                fixture.getCompetitionId(), fixture.getSeasonYear(), UNFINISHED_STATUSES);
        if (unfinished == 0) {
            overallSeasonScoringService.scoreSeason(
                    fixture.getCompetitionId(), fixture.getSeasonYear(), true);
            overallRescored = true;
        }

        log.info("Admin edited fixture {} -> {}:{} status={} (rescored {} predictions, overallRescored={})",
                fixtureId, request.homeScore(), request.awayScore(), status, predictionsRescored, overallRescored);

        return new EditFixtureResultResponse(
                fixtureId,
                predictionsRescored,
                overallRescored,
                fixture.getHomeScore(),
                fixture.getAwayScore(),
                status.name()
        );
    }

    private void validate(Fixture fixture,
                          List<EditFixtureResultRequest.ScorerInput> scorers,
                          List<EditFixtureResultRequest.AssisterInput> assisters) {
        Set<Long> fixtureTeamIds = new java.util.HashSet<>();
        if (fixture.getHomeTeamId() != null) fixtureTeamIds.add(fixture.getHomeTeamId());
        if (fixture.getAwayTeamId() != null) fixtureTeamIds.add(fixture.getAwayTeamId());

        Set<Long> playerIds = new java.util.HashSet<>();
        for (EditFixtureResultRequest.ScorerInput s : scorers) {
            requireTeamInFixture(s.teamId(), fixtureTeamIds);
            playerIds.add(s.playerId());
        }
        for (EditFixtureResultRequest.AssisterInput a : assisters) {
            requireTeamInFixture(a.teamId(), fixtureTeamIds);
            playerIds.add(a.playerId());
        }

        if (!playerIds.isEmpty()) {
            Set<Long> known = playerRepository.findAllByIdIn(playerIds).stream()
                    .map(Player::getId)
                    .collect(Collectors.toSet());
            playerIds.removeAll(known);
            if (!playerIds.isEmpty()) {
                throw new PredictionValidationException("Unknown player id(s): " + playerIds);
            }
        }
    }

    private void requireTeamInFixture(Long teamId, Set<Long> fixtureTeamIds) {
        if (!fixtureTeamIds.contains(teamId)) {
            throw new PredictionValidationException(
                    "Team " + teamId + " is not part of this fixture");
        }
    }

    private static Long resolveWinnerTeamId(Fixture fixture, Integer homeScore, Integer awayScore, FixtureStatus status) {
        if (!status.isFinal() || homeScore == null || awayScore == null) {
            return null;
        }
        if (homeScore > awayScore) return fixture.getHomeTeamId();
        if (awayScore > homeScore) return fixture.getAwayTeamId();
        return null;
    }

    private List<EventLine> aggregateGoals(List<FixtureEvent> events, Map<Long, String> playerNames) {
        // Group goals by (playerId, ownGoal) so own goals show as a separate line.
        Map<List<Object>, EventLine> acc = new LinkedHashMap<>();
        for (FixtureEvent e : events) {
            if (e.getType() != FixtureEventType.GOAL) continue;
            boolean ownGoal = OWN_GOAL_DETAIL.equalsIgnoreCase(e.getDetail());
            List<Object> key = List.of(e.getPlayerId(), ownGoal);
            EventLine prev = acc.get(key);
            int count = (prev != null ? prev.count() : 0) + 1;
            acc.put(key, new EventLine(e.getPlayerId(),
                    playerNames.get(e.getPlayerId()), e.getTeamId(), count, ownGoal));
        }
        return new ArrayList<>(acc.values());
    }

    private List<EventLine> aggregateAssists(List<FixtureEvent> events, Map<Long, String> playerNames) {
        Map<Long, EventLine> acc = new LinkedHashMap<>();
        for (FixtureEvent e : events) {
            if (e.getType() != FixtureEventType.ASSIST) continue;
            EventLine prev = acc.get(e.getPlayerId());
            int count = (prev != null ? prev.count() : 0) + 1;
            acc.put(e.getPlayerId(), new EventLine(e.getPlayerId(),
                    playerNames.get(e.getPlayerId()), e.getTeamId(), count, false));
        }
        return new ArrayList<>(acc.values());
    }

    private List<PlayerSummary> roster(Long teamId, Integer seasonYear, Long competitionId) {
        if (teamId == null) {
            return List.of();
        }
        List<TeamPlayer> memberships = teamPlayerRepository
                .findAllByTeamIdAndSeasonYearAndCompetitionIdAndRemovedAtIsNull(teamId, seasonYear, competitionId);
        if (memberships.isEmpty()) {
            return List.of();
        }
        Set<Long> playerIds = memberships.stream().map(TeamPlayer::getPlayerId).collect(Collectors.toSet());
        Map<Long, Player> playersById = playerRepository.findAllByIdIn(playerIds).stream()
                .collect(Collectors.toMap(Player::getId, p -> p));
        return memberships.stream()
                .map(tp -> playersById.get(tp.getPlayerId()))
                .filter(java.util.Objects::nonNull)
                .map(p -> new PlayerSummary(p.getId(), p.getName(), p.getPhotoUrl(), p.getPosition()))
                .sorted(Comparator.comparing(PlayerSummary::name, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
    }

    private Map<Long, Team> teamsFor(List<Fixture> fixtures) {
        Set<Long> teamIds = new java.util.HashSet<>();
        for (Fixture f : fixtures) {
            if (f.getHomeTeamId() != null) teamIds.add(f.getHomeTeamId());
            if (f.getAwayTeamId() != null) teamIds.add(f.getAwayTeamId());
        }
        if (teamIds.isEmpty()) {
            return Map.of();
        }
        return teamRepository.findAllByIdIn(teamIds).stream()
                .collect(Collectors.toMap(Team::getId, t -> t));
    }

    private TeamSummary teamSummary(Long teamId, Map<Long, Team> teamsById) {
        if (teamId == null) {
            return new TeamSummary(null, null, null);
        }
        Team t = teamsById.get(teamId);
        return t == null
                ? new TeamSummary(teamId, null, null)
                : new TeamSummary(t.getId(), t.getName(), t.getLogoUrl());
    }

    private Competition competition(Long competitionId) {
        return competitionRepository.findById(competitionId)
                .orElseThrow(() -> new CompetitionNotFoundException("Competition not found: " + competitionId));
    }
}
