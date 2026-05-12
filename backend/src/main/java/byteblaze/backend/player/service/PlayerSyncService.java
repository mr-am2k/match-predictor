package byteblaze.backend.player.service;

import byteblaze.backend.competition.entity.Competition;

public interface PlayerSyncService {

    /**
     * Sync a single team's squad for the given competition/season.
     * Players in the previous snapshot but missing now are marked
     * {@code removedAt}. Returning players have {@code removedAt} cleared.
     */
    void syncSquadForTeam(Competition competition, Long teamId);

    /**
     * Iterate all known teams (from fixtures / existing squads) for the given
     * competition and sync each squad. Budget-aware: stops early if budget
     * is exhausted.
     */
    void syncSquadsForCompetition(Competition competition);
}
