package byteblaze.backend.prediction.service;

import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.fixture.repository.FixtureEventRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.prediction.dto.PlayerPick;
import byteblaze.backend.prediction.entity.Prediction;
import byteblaze.backend.prediction.entity.PredictionAssister;
import byteblaze.backend.prediction.entity.PredictionScore;
import byteblaze.backend.prediction.entity.PredictionScorer;
import byteblaze.backend.prediction.repository.PredictionAssisterRepository;
import byteblaze.backend.prediction.repository.PredictionRepository;
import byteblaze.backend.prediction.repository.PredictionScoreRepository;
import byteblaze.backend.prediction.repository.PredictionScorerRepository;
import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;
import byteblaze.backend.scoring.rules.repository.LeagueScoringRulesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Default {@link FixtureScoringService}. Holds the scoring loop that previously
 * lived inline in {@code FixtureSettledListener}, so both the automatic settle
 * path and the admin recalculation path share one implementation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FixtureScoringServiceImpl implements FixtureScoringService {

    private final FixtureRepository fixtureRepo;
    private final FixtureEventRepository eventRepo;
    private final PredictionRepository predictionRepo;
    private final PredictionScorerRepository scorerRepo;
    private final PredictionAssisterRepository assisterRepo;
    private final PredictionScoreRepository scoreRepo;
    private final ScoringEngine scoringEngine;
    private final LeagueScoringRulesRepository rulesRepo;

    @Override
    @Transactional
    public int scoreFixture(Long fixtureId, boolean force) {
        Fixture fixture = fixtureRepo.findById(fixtureId).orElse(null);
        if (fixture == null) {
            log.warn("scoreFixture for unknown fixture {}", fixtureId);
            return 0;
        }
        if (!force && fixture.getSettledAt() != null) {
            log.debug("Fixture {} already settled, skipping", fixture.getId());
            return 0;
        }

        List<Prediction> predictions = predictionRepo.findAllByFixtureId(fixture.getId());
        if (predictions.isEmpty()) {
            log.debug("Fixture {} had no predictions, marking settled", fixture.getId());
            markSettled(fixture);
            return 0;
        }

        List<UUID> predictionIds = predictions.stream().map(Prediction::getId).toList();

        // Recalculation: wipe prior score rows so they can be rewritten.
        if (force) {
            scoreRepo.deleteByPredictionIdIn(predictionIds);
        }

        List<FixtureEvent> events = eventRepo.findAllByFixtureId(fixture.getId());

        Map<UUID, List<PlayerPick>> scorerMap = new HashMap<>();
        for (PredictionScorer s : scorerRepo.findAllByPredictionIdIn(predictionIds)) {
            scorerMap.computeIfAbsent(s.getPredictionId(), k -> new ArrayList<>())
                    .add(new PlayerPick(s.getPlayerId(), s.getCount()));
        }
        Map<UUID, List<PlayerPick>> assisterMap = new HashMap<>();
        for (PredictionAssister a : assisterRepo.findAllByPredictionIdIn(predictionIds)) {
            assisterMap.computeIfAbsent(a.getPredictionId(), k -> new ArrayList<>())
                    .add(new PlayerPick(a.getPlayerId(), a.getCount()));
        }

        // Load rules once per distinct league to avoid N+1 during scoring.
        Set<UUID> leagueIds = predictions.stream().map(Prediction::getLeagueId).collect(Collectors.toSet());
        Map<UUID, LeagueScoringRules> rulesByLeagueId = rulesRepo.findAllById(leagueIds).stream()
                .collect(Collectors.toMap(LeagueScoringRules::getLeagueId, r -> r));

        Set<UUID> warnedLeagues = new HashSet<>();
        int scored = 0;
        int skipped = 0;
        for (Prediction p : predictions) {
            if (!force && scoreRepo.existsById(p.getId())) {
                // Re-entrant replay guard: already scored on a previous run.
                continue;
            }
            LeagueScoringRules rules = rulesByLeagueId.get(p.getLeagueId());
            if (rules == null) {
                if (warnedLeagues.add(p.getLeagueId())) {
                    log.warn("No league_scoring_rules row for league {} — skipping its predictions on fixture {}",
                            p.getLeagueId(), fixture.getId());
                }
                skipped++;
                continue;
            }
            List<PlayerPick> scorerPicks = scorerMap.getOrDefault(p.getId(), List.of());
            List<PlayerPick> assisterPicks = assisterMap.getOrDefault(p.getId(), List.of());

            ScoringResult result = scoringEngine.score(p, scorerPicks, assisterPicks, fixture, events, rules);

            PredictionScore score = PredictionScore.builder()
                    .predictionId(p.getId())
                    .points(result.points())
                    .breakdown(result.breakdownJson())
                    .settledAt(LocalDateTime.now())
                    .build();
            scoreRepo.save(score);
            scored++;
        }

        log.info("Scored {} prediction(s) for fixture {} (skipped {} for missing rules, force={})",
                scored, fixture.getId(), skipped, force);
        markSettled(fixture);
        return scored;
    }

    private void markSettled(Fixture fixture) {
        fixture.setSettledAt(LocalDateTime.now());
        fixtureRepo.save(fixture);
    }
}
