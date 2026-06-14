package byteblaze.backend.fixture.service;

import byteblaze.backend.competition.entity.Competition;

public interface FixtureSyncService {

    /**
     * Sync live + recent fixtures (today) for the given competition/season.
     * Publishes {@code FixtureSettledEvent} for fixtures that transition to
     * final in this sync run.
     */
    void syncLiveAndRecent(Competition competition);

    /**
     * Sync the next batch of upcoming fixtures for the given competition/season.
     * Only fixtures are upserted; no events fetched.
     */
    void syncUpcoming(Competition competition);

    /**
     * Score any fixture that is FINAL but has not yet been settled, regardless of
     * which sync first marked it final. Fetches goal/assist events and publishes
     * a {@code FixtureSettledEvent} per fixture. Self-healing and idempotent: a
     * fixture is only picked up while {@code settled_at IS NULL}.
     */
    void settlePendingFixtures(Competition competition);
}
