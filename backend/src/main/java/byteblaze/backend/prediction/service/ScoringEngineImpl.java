package byteblaze.backend.prediction.service;

import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.fixture.entity.FixtureEventType;
import byteblaze.backend.prediction.dto.PlayerPick;
import byteblaze.backend.prediction.entity.Prediction;
import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Default {@link ScoringEngine} implementation. Pure — no repository or
 * event-bus access. Point values and bonus multipliers are pulled from the
 * per-league {@link LeagueScoringRules} passed in by the caller (plan §1.2).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScoringEngineImpl implements ScoringEngine {

    private static final String OWN_GOAL_DETAIL = "Own Goal";
    private static final String CANCELLED_SKIP_JSON = "{\"skipped\":\"cancelled\"}";

    private final ObjectMapper objectMapper;

    @Override
    public ScoringResult score(
            Prediction prediction,
            List<PlayerPick> scorers,
            List<PlayerPick> assisters,
            Fixture fixture,
            List<FixtureEvent> events,
            LeagueScoringRules rules
    ) {
        if (fixture.getStatus() != null && fixture.getStatus().isCancelled()) {
            return new ScoringResult(0, CANCELLED_SKIP_JSON);
        }

        int winnerPoints = scoreWinner(prediction, fixture, rules);
        int exactScorePoints = scoreExactScore(prediction, fixture, rules);

        List<Map<String, Object>> scorerDetail = new ArrayList<>();
        PickTally scorerTally = scoreScorers(scorers, events, rules, scorerDetail);

        // Per-match assisters are only scored when the league has them enabled.
        // When disabled they contribute nothing and the match bonus re-tiers to
        // three categories (winner, exact score, scorer). The breakdown keeps an
        // (empty) "assisters" key so historical and new JSON share one shape.
        boolean assistersEnabled = rules.isAssistersEnabled();
        List<Map<String, Object>> assisterDetail = new ArrayList<>();
        PickTally assisterTally = assistersEnabled
                ? scoreAssisters(assisters, events, rules, assisterDetail)
                : new PickTally(0, false);

        int baseTotal = winnerPoints + exactScorePoints + scorerTally.points + assisterTally.points;

        int categoriesHit = 0;
        if (winnerPoints > 0) categoriesHit++;
        if (exactScorePoints > 0) categoriesHit++;
        if (scorerTally.anyHit) categoriesHit++;
        if (assistersEnabled && assisterTally.anyHit) categoriesHit++;

        BigDecimal multiplier = resolveMultiplier(categoriesHit, assistersEnabled, rules);
        int total = (int) Math.round(baseTotal * multiplier.doubleValue());

        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("winner", winnerPoints);
        breakdown.put("score", exactScorePoints);
        breakdown.put("scorers", scorerDetail);
        breakdown.put("assisters", assisterDetail);
        breakdown.put("categoriesHit", categoriesHit);
        breakdown.put("baseTotal", baseTotal);
        breakdown.put("multiplier", multiplier);
        breakdown.put("total", total);
        breakdown.put("ruleSetVersion", ruleSetVersion(rules));

        String json;
        try {
            json = objectMapper.writeValueAsString(breakdown);
        } catch (JacksonException e) {
            log.error("Failed to serialize scoring breakdown for prediction {}", prediction.getId(), e);
            json = "{\"error\":\"breakdown-serialization-failed\",\"total\":" + total + "}";
        }

        return new ScoringResult(total, json);
    }

    private int scoreWinner(Prediction prediction, Fixture fixture, LeagueScoringRules rules) {
        if (!fixture.getStatus().isFinal()) {
            return 0;
        }

        Integer homeScore = fixture.getHomeScore();
        Integer awayScore = fixture.getAwayScore();
        boolean actualIsDraw = homeScore != null && awayScore != null && homeScore.equals(awayScore);
        Long actualWinnerId = fixture.getWinnerTeamId();

        if (prediction.isPredictedDraw()) {
            return actualIsDraw ? rules.getMatchWinnerPoints() : 0;
        }

        Long predictedWinnerId = prediction.getWinnerTeamId();
        if (predictedWinnerId == null) {
            // No pick for winner; no points.
            return 0;
        }
        if (actualWinnerId != null && predictedWinnerId.equals(actualWinnerId)) {
            return rules.getMatchWinnerPoints();
        }
        return 0;
    }

    private int scoreExactScore(Prediction prediction, Fixture fixture, LeagueScoringRules rules) {
        if (!fixture.getStatus().isFinal()) {
            return 0;
        }
        Integer predHome = prediction.getHomeScore();
        Integer predAway = prediction.getAwayScore();
        if (predHome == null || predAway == null) {
            return 0;
        }
        Integer actualHome = fixture.getHomeScore();
        Integer actualAway = fixture.getAwayScore();
        if (actualHome == null || actualAway == null) {
            return 0;
        }
        boolean scoresMatch = predHome.equals(actualHome) && predAway.equals(actualAway);
        return scoresMatch ? rules.getMatchExactScorePoints() : 0;
    }

    private PickTally scoreScorers(
            List<PlayerPick> scorers,
            List<FixtureEvent> events,
            LeagueScoringRules rules,
            List<Map<String, Object>> detailOut
    ) {
        Map<Long, Integer> actualGoalsByPlayer = new HashMap<>();
        for (FixtureEvent e : events) {
            if (e.getType() == FixtureEventType.GOAL
                    && !OWN_GOAL_DETAIL.equalsIgnoreCase(e.getDetail())) {
                actualGoalsByPlayer.merge(e.getPlayerId(), 1, Integer::sum);
            }
        }

        int total = 0;
        boolean anyHit = false;
        for (PlayerPick pick : scorers) {
            if (pick == null || pick.playerId() == null || pick.count() == null) {
                continue;
            }
            int actual = actualGoalsByPlayer.getOrDefault(pick.playerId(), 0);
            boolean correct = actual == pick.count();
            // Points scale with the goal tally: a correct exact-count pick earns
            // matchScorerPoints per goal (e.g. 3 pts x 2 goals = 6).
            int points = correct ? rules.getMatchScorerPoints() * pick.count() : 0;
            if (correct) {
                total += points;
                anyHit = true;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("playerId", pick.playerId());
            row.put("predicted", pick.count());
            row.put("actual", actual);
            row.put("correct", correct);
            row.put("points", points);
            detailOut.add(row);
        }
        return new PickTally(total, anyHit);
    }

    private PickTally scoreAssisters(
            List<PlayerPick> assisters,
            List<FixtureEvent> events,
            LeagueScoringRules rules,
            List<Map<String, Object>> detailOut
    ) {
        Map<Long, Integer> actualAssistsByPlayer = new HashMap<>();
        for (FixtureEvent e : events) {
            if (e.getType() == FixtureEventType.ASSIST) {
                actualAssistsByPlayer.merge(e.getPlayerId(), 1, Integer::sum);
            }
        }

        int total = 0;
        boolean anyHit = false;
        for (PlayerPick pick : assisters) {
            if (pick == null || pick.playerId() == null || pick.count() == null) {
                continue;
            }
            int actual = actualAssistsByPlayer.getOrDefault(pick.playerId(), 0);
            boolean correct = actual == pick.count();
            int points = correct ? rules.getMatchAssisterPoints() : 0;
            if (correct) {
                total += points;
                anyHit = true;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("playerId", pick.playerId());
            row.put("predicted", pick.count());
            row.put("actual", actual);
            row.put("correct", correct);
            row.put("points", points);
            detailOut.add(row);
        }
        return new PickTally(total, anyHit);
    }

    private static BigDecimal resolveMultiplier(int categoriesHit, boolean assistersEnabled, LeagueScoringRules rules) {
        // With assisters enabled a match has 4 categories (winner, exact score,
        // scorer, assister); without them, 3. In both cases "everything correct"
        // earns the top bonus (match_bonus_4x). When assisters are disabled,
        // match_bonus_3x is intentionally orphaned — see the V13 rationale.
        int maxCategories = assistersEnabled ? 4 : 3;
        if (categoriesHit >= maxCategories) {
            return rules.getMatchBonus4x();
        }
        if (categoriesHit == 3) {
            return rules.getMatchBonus3x();
        }
        if (categoriesHit == 2) {
            return rules.getMatchBonus2x();
        }
        return BigDecimal.ONE;
    }

    private static long ruleSetVersion(LeagueScoringRules rules) {
        if (rules.getUpdatedAt() == null) {
            return 0L;
        }
        return rules.getUpdatedAt().toInstant(ZoneOffset.UTC).toEpochMilli();
    }

    private record PickTally(int points, boolean anyHit) {
    }
}
