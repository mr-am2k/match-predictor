package byteblaze.backend.prediction.service;

import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.fixture.entity.FixtureEventType;
import byteblaze.backend.fixture.entity.FixtureStatus;
import byteblaze.backend.prediction.dto.PlayerPick;
import byteblaze.backend.prediction.entity.Prediction;
import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the knockout-penalty scoring paths added in V15. Exercises the
 * "draw = 120 minutes" interpretation, the penalty-winner category, the
 * "only affect upcoming matches" enable-time gate, and the 4x multiplier cap.
 */
class ScoringEngineImplTest {

    private static final long HOME = 10L;
    private static final long AWAY = 20L;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ScoringEngineImpl engine = new ScoringEngineImpl(objectMapper);

    private LeagueScoringRules rules(boolean penaltiesEnabled,
                                     LocalDateTime penaltiesEnabledAt,
                                     boolean assistersEnabled) {
        return LeagueScoringRules.builder()
                .matchWinnerPoints(1)
                .matchExactScorePoints(2)
                .matchScorerPoints(3)
                .matchAssisterPoints(3)
                .leagueWinnerPoints(10)
                .leagueTopScorerPoints(5)
                .leagueTopAssisterPoints(5)
                .matchBonus2x(new BigDecimal("1.50"))
                .matchBonus3x(new BigDecimal("2.00"))
                .matchBonus4x(new BigDecimal("3.00"))
                .leagueBonus2of3(new BigDecimal("1.50"))
                .leagueBonus3of3(new BigDecimal("3.00"))
                .assistersEnabled(assistersEnabled)
                .penaltiesEnabled(penaltiesEnabled)
                .penaltyWinnerPoints(5)
                .penaltiesEnabledAt(penaltiesEnabledAt)
                .build();
    }

    private Fixture penaltyFixture(long homeShootout, long awayShootout) {
        return Fixture.builder()
                .id(1L)
                .competitionId(1L)
                .seasonYear(2026)
                .round("Final")
                .kickoffAt(OffsetDateTime.now())
                .status(FixtureStatus.PEN)
                .homeTeamId(HOME)
                .awayTeamId(AWAY)
                .homeScore(1)
                .awayScore(1)
                .winnerTeamId(homeShootout > awayShootout ? HOME : AWAY)
                .penaltyHomeScore((int) homeShootout)
                .penaltyAwayScore((int) awayShootout)
                .build();
    }

    private JsonNode breakdown(ScoringResult result) {
        return objectMapper.readTree(result.breakdownJson());
    }

    @Test
    void awardsPenaltyWhenEnabledAndFixtureStillOpenAtEnableTime() {
        LeagueScoringRules rules = rules(true, LocalDateTime.now().minusDays(1), false);
        Fixture fixture = penaltyFixture(4, 3); // home advances

        Prediction prediction = Prediction.builder()
                .predictedDraw(true)
                .penaltyWinnerTeamId(HOME)
                .homeScore(1)
                .awayScore(1)
                .build();

        ScoringResult result = engine.score(prediction, List.of(), List.of(), fixture, List.of(), rules);

        JsonNode b = breakdown(result);
        // winner (draw correct) = 1, exact score = 2, penalty = 5 → base 8.
        assertThat(b.path("penalty").asInt()).isEqualTo(5);
        assertThat(b.path("winner").asInt()).isEqualTo(1);
        assertThat(b.path("score").asInt()).isEqualTo(2);
        assertThat(b.path("categoriesHit").asInt()).isEqualTo(3); // winner + score + penalty
        assertThat(b.path("baseTotal").asInt()).isEqualTo(8);
        // 3 categories → match_bonus_3x (2.0) → 16
        assertThat(result.points()).isEqualTo(16);
    }

    @Test
    void doesNotAwardPenaltyWhenEnabledAfterFixtureLocked() {
        // Enabled "now" — the fixture's lock (kickoff - 15m) is already in the past,
        // so it was NOT still open at enable-time → penalty must not score.
        LeagueScoringRules rules = rules(true, LocalDateTime.now().plusMinutes(1), false);
        Fixture fixture = penaltyFixture(4, 3);

        Prediction prediction = Prediction.builder()
                .predictedDraw(true)
                .penaltyWinnerTeamId(HOME)
                .homeScore(1)
                .awayScore(1)
                .build();

        ScoringResult result = engine.score(prediction, List.of(), List.of(), fixture, List.of(), rules);

        JsonNode b = breakdown(result);
        assertThat(b.path("penalty").asInt()).isZero();
        assertThat(b.path("categoriesHit").asInt()).isEqualTo(2); // winner + score only
    }

    @Test
    void doesNotAwardPenaltyWhenDisabled() {
        LeagueScoringRules rules = rules(false, null, false);
        Fixture fixture = penaltyFixture(4, 3);

        Prediction prediction = Prediction.builder()
                .predictedDraw(true)
                .penaltyWinnerTeamId(HOME)
                .homeScore(1)
                .awayScore(1)
                .build();

        ScoringResult result = engine.score(prediction, List.of(), List.of(), fixture, List.of(), rules);

        assertThat(breakdown(result).path("penalty").asInt()).isZero();
    }

    @Test
    void wrongPenaltyPickScoresNothingForThatCategory() {
        LeagueScoringRules rules = rules(true, LocalDateTime.now().minusDays(1), false);
        Fixture fixture = penaltyFixture(4, 3); // home advances

        Prediction prediction = Prediction.builder()
                .predictedDraw(true)
                .penaltyWinnerTeamId(AWAY) // wrong
                .homeScore(1)
                .awayScore(1)
                .build();

        ScoringResult result = engine.score(prediction, List.of(), List.of(), fixture, List.of(), rules);

        assertThat(breakdown(result).path("penalty").asInt()).isZero();
    }

    @Test
    void extraTimeWinCountsAsAWinnerNotADraw() {
        LeagueScoringRules rules = rules(true, LocalDateTime.now().minusDays(1), false);
        Fixture fixture = Fixture.builder()
                .id(2L).competitionId(1L).seasonYear(2026).round("Semi-finals")
                .kickoffAt(OffsetDateTime.now())
                .status(FixtureStatus.AET)
                .homeTeamId(HOME).awayTeamId(AWAY)
                .homeScore(2).awayScore(1) // decided in extra time
                .winnerTeamId(HOME)
                .build();

        Prediction winnerPick = Prediction.builder()
                .winnerTeamId(HOME).predictedDraw(false).homeScore(2).awayScore(1).build();
        assertThat(breakdown(engine.score(winnerPick, List.of(), List.of(), fixture, List.of(), rules))
                .path("winner").asInt()).isEqualTo(1);

        Prediction drawPick = Prediction.builder().predictedDraw(true).build();
        assertThat(breakdown(engine.score(drawPick, List.of(), List.of(), fixture, List.of(), rules))
                .path("winner").asInt()).isZero();
    }

    @Test
    void multiplierCapsAtFourXWithFiveCategories() {
        LeagueScoringRules rules = rules(true, LocalDateTime.now().minusDays(1), true);
        Fixture fixture = penaltyFixture(4, 3);

        List<FixtureEvent> events = List.of(
                FixtureEvent.builder().fixtureId(1L).playerId(100L).teamId(HOME)
                        .type(FixtureEventType.GOAL).build(),
                FixtureEvent.builder().fixtureId(1L).playerId(200L).teamId(AWAY)
                        .type(FixtureEventType.ASSIST).build());

        Prediction prediction = Prediction.builder()
                .predictedDraw(true)
                .penaltyWinnerTeamId(HOME)
                .homeScore(1)
                .awayScore(1)
                .build();

        ScoringResult result = engine.score(
                prediction,
                List.of(new PlayerPick(100L, 1)),
                List.of(new PlayerPick(200L, 1)),
                fixture, events, rules);

        JsonNode b = breakdown(result);
        // winner + score + scorer + assister + penalty = 5 categories, capped at 4x.
        assertThat(b.path("categoriesHit").asInt()).isEqualTo(5);
        assertThat(b.path("multiplier").asDouble()).isEqualTo(3.0); // match_bonus_4x
        // base = 1 + 2 + 3 + 3 + 5 = 14 → 14 * 3 = 42
        assertThat(b.path("baseTotal").asInt()).isEqualTo(14);
        assertThat(result.points()).isEqualTo(42);
    }
}
