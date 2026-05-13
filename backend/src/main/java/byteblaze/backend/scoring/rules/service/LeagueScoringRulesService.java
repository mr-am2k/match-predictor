package byteblaze.backend.scoring.rules.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.scoring.rules.dto.LeagueScoringRulesRequest;
import byteblaze.backend.scoring.rules.dto.LeagueScoringRulesResponse;

import java.util.UUID;

public interface LeagueScoringRulesService {

    LeagueScoringRulesResponse get(UUID leagueId, User currentUser);

    LeagueScoringRulesResponse update(UUID leagueId, LeagueScoringRulesRequest body, User currentUser);

    /**
     * Insert a defaults row for a freshly-created league. Idempotent — if a row
     * already exists (e.g. from the V9 backfill when developing on a pre-existing
     * league), does nothing.
     */
    void createDefaults(UUID leagueId);

    /**
     * Write an owner-provided rules block for a freshly-created league.
     * Overwrites the V9 backfill row if one is already present (the league was
     * just created, so no predictions can exist yet).
     */
    void createFromRequest(UUID leagueId, LeagueScoringRulesRequest body);
}
