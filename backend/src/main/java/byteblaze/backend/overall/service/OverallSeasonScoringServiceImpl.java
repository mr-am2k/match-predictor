package byteblaze.backend.overall.service;

import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.fixture.entity.FixtureEventType;
import byteblaze.backend.fixture.repository.FixtureEventRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.overall.entity.LeagueOverallPrediction;
import byteblaze.backend.overall.entity.LeagueOverallScore;
import byteblaze.backend.overall.repository.LeagueOverallPredictionRepository;
import byteblaze.backend.overall.repository.LeagueOverallScoreRepository;
import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;
import byteblaze.backend.scoring.rules.repository.LeagueScoringRulesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Default {@link OverallSeasonScoringService}. Holds the season-scoring logic
 * that previously lived inline in {@code SeasonSettledListener}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OverallSeasonScoringServiceImpl implements OverallSeasonScoringService {

    private static final String OWN_GOAL_DETAIL = "Own Goal";

    private final FixtureRepository fixtureRepository;
    private final FixtureEventRepository fixtureEventRepository;
    private final LeagueRepository leagueRepository;
    private final LeagueOverallPredictionRepository overallPredictionRepository;
    private final LeagueOverallScoreRepository overallScoreRepository;
    private final LeagueScoringRulesRepository rulesRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void scoreSeason(Long competitionId, Integer season, boolean force) {
        log.info("scoreSeason: scoring overall predictions for comp={} season={} force={}",
                competitionId, season, force);

        List<Fixture> fixtures = fixtureRepository.findAllByCompetitionIdAndSeasonYear(competitionId, season);

        // Actual season winner: team with most wins; tie => null
        Long actualWinnerTeamId = computeActualWinner(fixtures);

        // Aggregate scorers + assisters across all fixtures.
        List<FixtureEvent> allEvents = loadAllEvents(fixtures);
        Set<Long> topScorerIds = computeTopPlayers(allEvents, FixtureEventType.GOAL, /*excludeOwnGoals=*/true);
        Set<Long> topAssisterIds = computeTopPlayers(allEvents, FixtureEventType.ASSIST, /*excludeOwnGoals=*/false);

        List<League> leagues = leagueRepository.findActiveByCompetitionAndSeason(competitionId, season);
        for (League league : leagues) {
            try {
                scoreLeague(league, actualWinnerTeamId, topScorerIds, topAssisterIds, force);
            } catch (Exception e) {
                log.error("scoreSeason: failed to score league={}: {}", league.getId(), e.getMessage(), e);
            }
        }
    }

    private void scoreLeague(League league,
                             Long actualWinnerTeamId,
                             Set<Long> topScorerIds,
                             Set<Long> topAssisterIds,
                             boolean force) {
        LeagueScoringRules rules = rulesRepository.findById(league.getId()).orElse(null);
        if (rules == null) {
            log.warn("scoreSeason: no scoring rules for league={}; skipping", league.getId());
            return;
        }

        List<LeagueOverallPrediction> predictions = overallPredictionRepository.findAllByLeagueId(league.getId());
        if (predictions.isEmpty()) {
            return;
        }

        // Recalculation: wipe prior score rows so they can be rewritten.
        if (force) {
            overallScoreRepository.deleteByPredictionIdIn(predictions.stream().map(LeagueOverallPrediction::getId).toList());
        }

        for (LeagueOverallPrediction p : predictions) {
            if (!force && overallScoreRepository.existsById(p.getId())) {
                continue; // idempotent
            }

            boolean winnerCorrect = p.getWinnerTeamId() != null
                    && actualWinnerTeamId != null
                    && p.getWinnerTeamId().equals(actualWinnerTeamId);
            boolean scorerCorrect = p.getTopScorerPlayerId() != null
                    && topScorerIds.contains(p.getTopScorerPlayerId());
            boolean assisterCorrect = p.getTopAssisterPlayerId() != null
                    && topAssisterIds.contains(p.getTopAssisterPlayerId());

            int winnerPts = winnerCorrect ? rules.getLeagueWinnerPoints() : 0;
            int scorerPts = scorerCorrect ? rules.getLeagueTopScorerPoints() : 0;
            int assisterPts = assisterCorrect ? rules.getLeagueTopAssisterPoints() : 0;
            int base = winnerPts + scorerPts + assisterPts;

            int categoriesHit = (winnerCorrect ? 1 : 0)
                    + (scorerCorrect ? 1 : 0)
                    + (assisterCorrect ? 1 : 0);

            BigDecimal multiplier = BigDecimal.ONE;
            if (categoriesHit >= 3) {
                multiplier = rules.getLeagueBonus3of3();
            } else if (categoriesHit == 2) {
                multiplier = rules.getLeagueBonus2of3();
            }

            int total = BigDecimal.valueOf(base)
                    .multiply(multiplier)
                    .setScale(0, RoundingMode.HALF_UP)
                    .intValue();

            LeagueOverallScore score = LeagueOverallScore.builder()
                    .predictionId(p.getId())
                    .points(total)
                    .breakdown(serializeBreakdown(winnerCorrect, scorerCorrect, assisterCorrect,
                            categoriesHit, base, multiplier, total))
                    .settledAt(LocalDateTime.now())
                    .build();
            overallScoreRepository.save(score);
        }
    }

    private Long computeActualWinner(List<Fixture> fixtures) {
        Map<Long, Integer> winCounts = new HashMap<>();
        for (Fixture f : fixtures) {
            if (f.getStatus() == null || !f.getStatus().isFinal()) continue;
            Long winner = f.getWinnerTeamId();
            if (winner == null) continue; // draw
            winCounts.merge(winner, 1, Integer::sum);
        }
        if (winCounts.isEmpty()) return null;
        int max = winCounts.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        long numAtMax = winCounts.values().stream().filter(v -> v == max).count();
        if (numAtMax != 1) return null; // tie → no clear winner
        return winCounts.entrySet().stream()
                .filter(e -> e.getValue() == max)
                .findFirst()
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private List<FixtureEvent> loadAllEvents(List<Fixture> fixtures) {
        List<Long> finalFixtureIds = fixtures.stream()
                .filter(f -> f.getStatus() != null && f.getStatus().isFinal())
                .map(Fixture::getId)
                .toList();
        if (finalFixtureIds.isEmpty()) return List.of();
        // Simple batch: iterate (avoid huge IN clauses; per-fixture fetch is fine at season size).
        List<FixtureEvent> out = new java.util.ArrayList<>();
        for (Long fid : finalFixtureIds) {
            out.addAll(fixtureEventRepository.findAllByFixtureId(fid));
        }
        return out;
    }

    /** Returns the set of player ids tied at the top count for the given event type. */
    private Set<Long> computeTopPlayers(List<FixtureEvent> events,
                                        FixtureEventType type,
                                        boolean excludeOwnGoals) {
        Map<Long, Integer> counts = new HashMap<>();
        for (FixtureEvent e : events) {
            if (e.getType() != type) continue;
            if (excludeOwnGoals && OWN_GOAL_DETAIL.equalsIgnoreCase(e.getDetail())) continue;
            if (e.getPlayerId() == null) continue;
            counts.merge(e.getPlayerId(), 1, Integer::sum);
        }
        if (counts.isEmpty()) return Set.of();
        int max = counts.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        Set<Long> result = new TreeSet<>();
        for (Map.Entry<Long, Integer> e : counts.entrySet()) {
            if (e.getValue() == max) result.add(e.getKey());
        }
        return result;
    }

    private String serializeBreakdown(boolean winnerCorrect,
                                      boolean scorerCorrect,
                                      boolean assisterCorrect,
                                      int categoriesHit,
                                      int baseTotal,
                                      BigDecimal multiplier,
                                      int total) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("winner", winnerCorrect ? "Y" : "N");
        m.put("topScorer", scorerCorrect ? "Y" : "N");
        m.put("topAssister", assisterCorrect ? "Y" : "N");
        m.put("categoriesHit", categoriesHit);
        m.put("baseTotal", baseTotal);
        m.put("multiplier", multiplier.setScale(2, RoundingMode.HALF_UP));
        m.put("total", total);
        try {
            return objectMapper.writeValueAsString(m);
        } catch (JacksonException e) {
            log.warn("Failed to serialize breakdown: {}", e.getMessage());
            return "{}";
        }
    }
}
