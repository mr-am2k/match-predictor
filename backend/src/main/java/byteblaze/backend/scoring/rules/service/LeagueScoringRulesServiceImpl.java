package byteblaze.backend.scoring.rules.service;

import byteblaze.backend.auth.entity.Role;
import byteblaze.backend.auth.entity.User;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.exception.LeagueAccessDeniedException;
import byteblaze.backend.league.exception.LeagueNotFoundException;
import byteblaze.backend.league.repository.LeagueMembershipRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.prediction.config.ScoringProperties;
import byteblaze.backend.prediction.repository.PredictionRepository;
import byteblaze.backend.scoring.rules.dto.LeagueScoringRulesRequest;
import byteblaze.backend.scoring.rules.dto.LeagueScoringRulesResponse;
import byteblaze.backend.scoring.rules.entity.LeagueScoringRules;
import byteblaze.backend.scoring.rules.exception.OnlyOwnerCanEditScoringRulesException;
import byteblaze.backend.scoring.rules.exception.ScoringRulesLockedException;
import byteblaze.backend.scoring.rules.repository.LeagueScoringRulesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Orchestrates reads/writes on {@link LeagueScoringRules}. Mirrors the
 * access-control story used by {@code PredictionServiceImpl}: member-only for
 * reads, owner-only for writes, with an additional lock once predictions start
 * rolling in (plan §1.3).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LeagueScoringRulesServiceImpl implements LeagueScoringRulesService {

    private final LeagueScoringRulesRepository rulesRepo;
    private final LeagueRepository leagueRepo;
    private final LeagueMembershipRepository membershipRepo;
    private final PredictionRepository predictionRepo;
    private final ScoringProperties scoringProperties;

    // V9 defaults, mirrored in code so createDefaults() can build a row without
    // round-tripping through the DB default.
    private static final int DEFAULT_MATCH_WINNER_POINTS = 1;
    private static final int DEFAULT_MATCH_EXACT_SCORE_POINTS = 2;
    private static final int DEFAULT_MATCH_SCORER_POINTS = 3;
    private static final int DEFAULT_MATCH_ASSISTER_POINTS = 3;
    private static final int DEFAULT_LEAGUE_WINNER_POINTS = 10;
    private static final int DEFAULT_LEAGUE_TOP_SCORER_POINTS = 5;
    private static final int DEFAULT_LEAGUE_TOP_ASSISTER_POINTS = 5;
    private static final BigDecimal DEFAULT_MATCH_BONUS_2X = new BigDecimal("1.50");
    private static final BigDecimal DEFAULT_MATCH_BONUS_3X = new BigDecimal("2.00");
    private static final BigDecimal DEFAULT_MATCH_BONUS_4X = new BigDecimal("3.00");
    private static final BigDecimal DEFAULT_LEAGUE_BONUS_2OF3 = new BigDecimal("1.50");
    private static final BigDecimal DEFAULT_LEAGUE_BONUS_3OF3 = new BigDecimal("3.00");

    @Override
    @Transactional(readOnly = true)
    public LeagueScoringRulesResponse get(UUID leagueId, User currentUser) {
        requireLeagueMember(leagueId, currentUser);

        LeagueScoringRules rules = rulesRepo.findById(leagueId).orElse(null);
        if (rules == null) {
            // Shouldn't happen post-backfill, but be defensive — create + save
            // a defaults row so subsequent calls are stable.
            log.warn("Missing league_scoring_rules for league {} — inserting defaults", leagueId);
            rules = rulesRepo.save(buildDefaults(leagueId));
        }
        return toResponse(rules, computeEditable(leagueId));
    }

    @Override
    @Transactional
    public LeagueScoringRulesResponse update(UUID leagueId, LeagueScoringRulesRequest body, User currentUser) {
        League league = leagueRepo.findById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        // Admins may edit any league's rules mid-season (including the assister
        // toggle), bypassing both the owner-only and locked-once-predictions
        // guards. Owners keep the original, stricter behaviour.
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;

        if (!isAdmin && !league.getOwner().getId().equals(currentUser.getId())) {
            log.debug("User {} attempted to edit scoring rules for league {} (not owner, not admin)",
                    currentUser.getId(), leagueId);
            throw new OnlyOwnerCanEditScoringRulesException();
        }

        if (!isAdmin && !computeEditable(leagueId)) {
            log.debug("Scoring rules locked for league {} (predictions already submitted)", leagueId);
            throw new ScoringRulesLockedException();
        }

        LeagueScoringRules rules = rulesRepo.findById(leagueId).orElseGet(() -> buildDefaults(leagueId));
        applyRequest(rules, body);
        rules = rulesRepo.save(rules);

        // Same editability check the GET computes; it can only flip to false
        // between requests, never back to true, so we can just re-emit.
        return toResponse(rules, computeEditable(leagueId));
    }

    @Override
    @Transactional
    public void createDefaults(UUID leagueId) {
        if (rulesRepo.existsById(leagueId)) {
            return;
        }
        rulesRepo.save(buildDefaults(leagueId));
    }

    @Override
    @Transactional
    public void createFromRequest(UUID leagueId, LeagueScoringRulesRequest body) {
        LeagueScoringRules rules = rulesRepo.findById(leagueId).orElseGet(() -> {
            LeagueScoringRules fresh = new LeagueScoringRules();
            fresh.setLeagueId(leagueId);
            return fresh;
        });
        applyRequest(rules, body);
        rulesRepo.save(rules);
    }

    // ----------------- internals -----------------

    private void requireLeagueMember(UUID leagueId, User currentUser) {
        if (!leagueRepo.existsById(leagueId)) {
            throw new LeagueNotFoundException("League not found: " + leagueId);
        }
        if (!membershipRepo.existsByLeagueIdAndUserId(leagueId, currentUser.getId())) {
            throw new LeagueAccessDeniedException("You do not have access to this league");
        }
    }

    private boolean computeEditable(UUID leagueId) {
        return !predictionRepo.existsByLeagueId(leagueId);
    }

    private LeagueScoringRules buildDefaults(UUID leagueId) {
        return LeagueScoringRules.builder()
                .leagueId(leagueId)
                .matchWinnerPoints(safePoints(scoringProperties == null ? null : scoringProperties.winnerPoints(),
                        DEFAULT_MATCH_WINNER_POINTS))
                .matchExactScorePoints(safePoints(
                        scoringProperties == null ? null : scoringProperties.exactScorePoints(),
                        DEFAULT_MATCH_EXACT_SCORE_POINTS))
                .matchScorerPoints(safePoints(scoringProperties == null ? null : scoringProperties.scorerPoints(),
                        DEFAULT_MATCH_SCORER_POINTS))
                .matchAssisterPoints(safePoints(
                        scoringProperties == null ? null : scoringProperties.assisterPoints(),
                        DEFAULT_MATCH_ASSISTER_POINTS))
                .leagueWinnerPoints(DEFAULT_LEAGUE_WINNER_POINTS)
                .leagueTopScorerPoints(DEFAULT_LEAGUE_TOP_SCORER_POINTS)
                .leagueTopAssisterPoints(DEFAULT_LEAGUE_TOP_ASSISTER_POINTS)
                .matchBonus2x(DEFAULT_MATCH_BONUS_2X)
                .matchBonus3x(DEFAULT_MATCH_BONUS_3X)
                .matchBonus4x(DEFAULT_MATCH_BONUS_4X)
                .leagueBonus2of3(DEFAULT_LEAGUE_BONUS_2OF3)
                .leagueBonus3of3(DEFAULT_LEAGUE_BONUS_3OF3)
                .assistersEnabled(true)
                .build();
    }

    private static int safePoints(Integer configured, int fallback) {
        return configured == null ? fallback : configured;
    }

    private static void applyRequest(LeagueScoringRules rules, LeagueScoringRulesRequest body) {
        rules.setMatchWinnerPoints(body.matchWinnerPoints());
        rules.setMatchExactScorePoints(body.matchExactScorePoints());
        rules.setMatchScorerPoints(body.matchScorerPoints());
        rules.setMatchAssisterPoints(body.matchAssisterPoints());
        rules.setLeagueWinnerPoints(body.leagueWinnerPoints());
        rules.setLeagueTopScorerPoints(body.leagueTopScorerPoints());
        rules.setLeagueTopAssisterPoints(body.leagueTopAssisterPoints());
        rules.setMatchBonus2x(body.matchBonus2x());
        rules.setMatchBonus3x(body.matchBonus3x());
        rules.setMatchBonus4x(body.matchBonus4x());
        rules.setLeagueBonus2of3(body.leagueBonus2of3());
        rules.setLeagueBonus3of3(body.leagueBonus3of3());
        // Null (older clients / league creation) means "leave assisters enabled".
        rules.setAssistersEnabled(body.assistersEnabled() == null || body.assistersEnabled());
    }

    private static LeagueScoringRulesResponse toResponse(LeagueScoringRules rules, boolean editable) {
        return new LeagueScoringRulesResponse(
                rules.getMatchWinnerPoints(),
                rules.getMatchExactScorePoints(),
                rules.getMatchScorerPoints(),
                rules.getMatchAssisterPoints(),
                rules.getLeagueWinnerPoints(),
                rules.getLeagueTopScorerPoints(),
                rules.getLeagueTopAssisterPoints(),
                rules.getMatchBonus2x(),
                rules.getMatchBonus3x(),
                rules.getMatchBonus4x(),
                rules.getLeagueBonus2of3(),
                rules.getLeagueBonus3of3(),
                rules.isAssistersEnabled(),
                editable
        );
    }
}
