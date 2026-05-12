package byteblaze.backend.prediction.service;

import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.fixture.entity.FixtureEventType;
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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
            List<Long> scorerPlayerIds,
            List<Long> assisterPlayerIds,
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
        ScorerTally scorerTally = scoreScorers(scorerPlayerIds, events, rules, scorerDetail);

        List<Map<String, Object>> assisterDetail = new ArrayList<>();
        AssisterTally assisterTally = scoreAssisters(assisterPlayerIds, events, rules, assisterDetail);

        int baseTotal = winnerPoints + exactScorePoints + scorerTally.points + assisterTally.points;

        int categoriesHit = 0;
        if (winnerPoints > 0) categoriesHit++;
        if (exactScorePoints > 0) categoriesHit++;
        if (scorerTally.anyHit) categoriesHit++;
        if (assisterTally.anyHit) categoriesHit++;

        BigDecimal multiplier = resolveMultiplier(categoriesHit, rules);
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

    private ScorerTally scoreScorers(
            List<Long> scorerPlayerIds,
            List<FixtureEvent> events,
            LeagueScoringRules rules,
            List<Map<String, Object>> detailOut
    ) {
        Set<Long> actualScorers = new HashSet<>();
        for (FixtureEvent e : events) {
            if (e.getType() == FixtureEventType.GOAL && !OWN_GOAL_DETAIL.equalsIgnoreCase(e.getDetail())) {
                actualScorers.add(e.getPlayerId());
            }
        }

        Set<Long> seen = new HashSet<>();
        int total = 0;
        boolean anyHit = false;
        for (Long pid : scorerPlayerIds) {
            if (pid == null || !seen.add(pid)) {
                continue;
            }
            boolean hit = actualScorers.contains(pid);
            int points = hit ? rules.getMatchScorerPoints() : 0;
            total += points;
            if (hit) {
                anyHit = true;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("playerId", pid);
            row.put("points", points);
            detailOut.add(row);
        }
        return new ScorerTally(total, anyHit);
    }

    private AssisterTally scoreAssisters(
            List<Long> assisterPlayerIds,
            List<FixtureEvent> events,
            LeagueScoringRules rules,
            List<Map<String, Object>> detailOut
    ) {
        Set<Long> actualAssisters = new HashSet<>();
        for (FixtureEvent e : events) {
            if (e.getType() == FixtureEventType.ASSIST) {
                actualAssisters.add(e.getPlayerId());
            }
        }

        Set<Long> seen = new HashSet<>();
        int total = 0;
        boolean anyHit = false;
        for (Long pid : assisterPlayerIds) {
            if (pid == null || !seen.add(pid)) {
                continue;
            }
            boolean hit = actualAssisters.contains(pid);
            int points = hit ? rules.getMatchAssisterPoints() : 0;
            total += points;
            if (hit) {
                anyHit = true;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("playerId", pid);
            row.put("points", points);
            detailOut.add(row);
        }
        return new AssisterTally(total, anyHit);
    }

    private static BigDecimal resolveMultiplier(int categoriesHit, LeagueScoringRules rules) {
        if (categoriesHit >= 4) {
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

    private record ScorerTally(int points, boolean anyHit) {
    }

    private record AssisterTally(int points, boolean anyHit) {
    }
}
