package byteblaze.backend.prediction.service;

import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.prediction.entity.Prediction;
import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;

import java.util.List;

/**
 * Pure, stateless scoring utility.
 *
 * <p>The engine consumes a fully hydrated {@link Prediction} (plus the
 * caller-provided scorer / assister picks), the settled {@link Fixture} and
 * its {@link FixtureEvent goal + assist events}, and the
 * {@link LeagueScoringRules} for the prediction's league, and emits a
 * {@link ScoringResult} containing the total points and a JSON breakdown.
 *
 * <p>Picks and rules are passed explicitly rather than loaded here so the
 * engine carries no repository dependencies and is trivially unit-testable.</p>
 */
public interface ScoringEngine {

    ScoringResult score(
            Prediction prediction,
            List<Long> scorerPlayerIds,
            List<Long> assisterPlayerIds,
            Fixture fixture,
            List<FixtureEvent> events,
            LeagueScoringRules rules
    );
}
