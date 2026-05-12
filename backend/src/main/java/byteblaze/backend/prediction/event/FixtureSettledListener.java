package byteblaze.backend.prediction.event;

import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.fixture.event.FixtureSettledEvent;
import byteblaze.backend.fixture.repository.FixtureEventRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.prediction.entity.Prediction;
import byteblaze.backend.prediction.entity.PredictionAssister;
import byteblaze.backend.prediction.entity.PredictionScore;
import byteblaze.backend.prediction.entity.PredictionScorer;
import byteblaze.backend.prediction.repository.PredictionAssisterRepository;
import byteblaze.backend.prediction.repository.PredictionRepository;
import byteblaze.backend.prediction.repository.PredictionScoreRepository;
import byteblaze.backend.prediction.repository.PredictionScorerRepository;
import byteblaze.backend.prediction.service.ScoringEngine;
import byteblaze.backend.prediction.service.ScoringResult;
import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;
import byteblaze.backend.scoring.rules.repository.LeagueScoringRulesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Drives the scoring engine off the back of a {@link FixtureSettledEvent}.
 *
 * <p>Lives in the {@code prediction.event} package (rather than
 * {@code fixture.event}) because it owns writes to the prediction tables —
 * keeping scoring logic co-located.</p>
 *
 * <p>Runs async + after-commit so fixture-sync DB writes are durable before
 * we read them, and so scoring never blocks the sync transaction.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FixtureSettledListener {

    private final FixtureRepository fixtureRepo;
    private final FixtureEventRepository eventRepo;
    private final PredictionRepository predictionRepo;
    private final PredictionScorerRepository scorerRepo;
    private final PredictionAssisterRepository assisterRepo;
    private final PredictionScoreRepository scoreRepo;
    private final ScoringEngine scoringEngine;
    private final LeagueScoringRulesRepository rulesRepo;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onFixtureSettled(FixtureSettledEvent event) {
        Fixture fixture = fixtureRepo.findById(event.fixtureId()).orElse(null);
        if (fixture == null) {
            log.warn("FixtureSettledEvent for unknown fixture {}", event.fixtureId());
            return;
        }
        if (fixture.getSettledAt() != null) {
            log.debug("Fixture {} already settled, skipping", fixture.getId());
            return;
        }

        List<Prediction> predictions = predictionRepo.findAllByFixtureId(fixture.getId());
        if (predictions.isEmpty()) {
            log.debug("Fixture {} had no predictions, marking settled", fixture.getId());
            markSettled(fixture);
            return;
        }

        List<FixtureEvent> events = eventRepo.findAllByFixtureId(fixture.getId());

        List<UUID> predictionIds = predictions.stream().map(Prediction::getId).toList();
        Map<UUID, List<Long>> scorerMap = groupByPrediction(
                scorerRepo.findAllByPredictionIdIn(predictionIds),
                PredictionScorer::getPredictionId,
                PredictionScorer::getPlayerId
        );
        Map<UUID, List<Long>> assisterMap = groupByPrediction(
                assisterRepo.findAllByPredictionIdIn(predictionIds),
                PredictionAssister::getPredictionId,
                PredictionAssister::getPlayerId
        );

        // Load rules once per distinct league to avoid N+1 during scoring.
        Set<UUID> leagueIds = predictions.stream().map(Prediction::getLeagueId).collect(Collectors.toSet());
        Map<UUID, LeagueScoringRules> rulesByLeagueId = rulesRepo.findAllById(leagueIds).stream()
                .collect(Collectors.toMap(LeagueScoringRules::getLeagueId, r -> r));

        Set<UUID> warnedLeagues = new HashSet<>();
        int scored = 0;
        int skipped = 0;
        for (Prediction p : predictions) {
            if (scoreRepo.existsById(p.getId())) {
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
            List<Long> scorerIds = scorerMap.getOrDefault(p.getId(), List.of());
            List<Long> assisterIds = assisterMap.getOrDefault(p.getId(), List.of());

            ScoringResult result = scoringEngine.score(p, scorerIds, assisterIds, fixture, events, rules);

            PredictionScore score = PredictionScore.builder()
                    .predictionId(p.getId())
                    .points(result.points())
                    .breakdown(result.breakdownJson())
                    .settledAt(LocalDateTime.now())
                    .build();
            scoreRepo.save(score);
            scored++;
        }

        log.info("Scored {} prediction(s) for fixture {} (skipped {} for missing rules)",
                scored, fixture.getId(), skipped);
        markSettled(fixture);
    }

    private void markSettled(Fixture fixture) {
        fixture.setSettledAt(LocalDateTime.now());
        fixtureRepo.save(fixture);
    }

    private <T> Map<UUID, List<Long>> groupByPrediction(
            Collection<T> rows,
            Function<T, UUID> keyFn,
            Function<T, Long> valueFn
    ) {
        Map<UUID, List<Long>> out = new HashMap<>();
        for (T row : rows) {
            out.computeIfAbsent(keyFn.apply(row), k -> new java.util.ArrayList<>())
                    .add(valueFn.apply(row));
        }
        return out;
    }
}
