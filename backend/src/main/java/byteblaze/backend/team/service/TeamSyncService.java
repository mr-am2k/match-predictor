package byteblaze.backend.team.service;

import byteblaze.backend.competition.entity.Competition;

public interface TeamSyncService {

    /**
     * Sync teams participating in the given competition/season. Create or
     * update by API id; sets name/code/country/logoUrl/lastSyncedAt.
     */
    void syncTeams(Competition competition);

    /**
     * Ensure a row exists in the teams table for the given API id. If
     * missing, inserts a minimal stub from the data provided. Used by
     * fixture sync to avoid FK violations when fixtures reference teams
     * the scheduled team sync hasn't picked up yet.
     */
    void ensureTeamStub(Long teamId, String name, String logoUrl);
}
