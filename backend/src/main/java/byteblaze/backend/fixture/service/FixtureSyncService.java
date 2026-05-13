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
}
