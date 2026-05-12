package byteblaze.backend.prediction.service;

import byteblaze.backend.auth.entity.User;
import byteblaze.backend.auth.repository.UserRepository;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.exception.LeagueAccessDeniedException;
import byteblaze.backend.league.exception.LeagueNotFoundException;
import byteblaze.backend.league.repository.LeagueMembershipRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.overall.repository.LeagueOverallPredictionRepository;
import byteblaze.backend.prediction.dto.GameweekStandingsRowResponse;
import byteblaze.backend.prediction.dto.StandingsRowResponse;
import byteblaze.backend.prediction.repository.PredictionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Reads aggregated standings for a league.
 *
 * <p>Only scored predictions contribute; members with zero scored predictions
 * are intentionally omitted (leaderboards showing "0 points / 0 played" for
 * everyone who hasn't played yet adds noise).</p>
 */
@Service
@RequiredArgsConstructor
public class StandingsServiceImpl implements StandingsService {

    private final PredictionRepository predictionRepo;
    private final LeagueMembershipRepository membershipRepo;
    private final LeagueRepository leagueRepo;
    private final UserRepository userRepo;
    private final LeagueOverallPredictionRepository overallPredictionRepo;

    @Override
    @Transactional(readOnly = true)
    public Page<StandingsRowResponse> getStandings(UUID leagueId, User currentUser, Pageable pageable) {
        if (currentUser == null || !membershipRepo.existsByLeagueIdAndUserId(leagueId, currentUser.getId())) {
            // Reusing the Phase 1 access-denied exception (already mapped to 403
            // in GlobalExceptionHandler) rather than NotALeagueMemberException
            // to avoid stepping on the predictions-backend agent's wiring.
            throw new LeagueAccessDeniedException("You do not have access to this league");
        }

        List<Object[]> rows = predictionRepo.findStandingsByLeagueId(leagueId);
        List<Object[]> overallRows = overallPredictionRepo.findOverallScoresByLeagueId(leagueId);
        if (rows.isEmpty() && overallRows.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        record Row(UUID userId, int totalPoints, int gameweeksPlayed) {
        }

        // Merge per-match standings + league-wide overall scores by userId.
        Map<UUID, int[]> merged = new HashMap<>();  // [totalPoints, gameweeksPlayed]
        for (Object[] r : rows) {
            UUID userId = (UUID) r[0];
            int totalPoints = ((Number) r[1]).intValue();
            int gameweeksPlayed = ((Number) r[2]).intValue();
            merged.put(userId, new int[]{totalPoints, gameweeksPlayed});
        }
        for (Object[] r : overallRows) {
            UUID userId = (UUID) r[0];
            int points = ((Number) r[1]).intValue();
            merged.merge(userId, new int[]{points, 0}, (a, b) -> new int[]{a[0] + b[0], a[1]});
        }

        List<Row> mapped = new ArrayList<>(merged.size());
        for (Map.Entry<UUID, int[]> e : merged.entrySet()) {
            mapped.add(new Row(e.getKey(), e.getValue()[0], e.getValue()[1]));
        }

        Comparator<Row> byPointsDesc = Comparator.comparingInt(Row::totalPoints).reversed();
        Comparator<Row> byUserIdAsc = Comparator.comparing((Row r) -> r.userId().toString());
        mapped.sort(byPointsDesc.thenComparing(byUserIdAsc));

        Map<UUID, String> usernames = userRepo.findAllById(mapped.stream().map(Row::userId).toList())
                .stream()
                .collect(Collectors.toMap(User::getId, User::getUsername, (a, b) -> a, HashMap::new));

        List<StandingsRowResponse> out = new ArrayList<>(mapped.size());
        int rank = 0;
        int index = 0;
        Integer lastPoints = null;
        for (Row row : mapped) {
            index++;
            // Competition-style ranks: ties share, next skips (1, 2, 2, 4).
            if (lastPoints == null || row.totalPoints() != lastPoints) {
                rank = index;
                lastPoints = row.totalPoints();
            }
            String username = usernames.getOrDefault(row.userId(), "");
            out.add(new StandingsRowResponse(
                    row.userId(),
                    username,
                    row.totalPoints(),
                    row.gameweeksPlayed(),
                    rank
            ));
        }

        // Slice the fully-computed, already-sorted list into the requested page.
        // A proper SQL LIMIT/OFFSET is overkill for Phase 3 league sizes (10–50).
        int total = out.size();
        int from = Math.min((int) pageable.getOffset(), total);
        int to = Math.min(from + pageable.getPageSize(), total);
        List<StandingsRowResponse> slice = out.subList(from, to);
        return new PageImpl<>(slice, pageable, total);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GameweekStandingsRowResponse> getGameweekStandings(UUID leagueId, String round, User currentUser) {
        if (currentUser == null || !membershipRepo.existsByLeagueIdAndUserId(leagueId, currentUser.getId())) {
            throw new LeagueAccessDeniedException("You do not have access to this league");
        }

        League league = leagueRepo.findById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        Long competitionId = league.getCompetition().getId();
        Integer seasonYear = league.getSeasonYear();

        List<Object[]> rows = predictionRepo.findGameweekStandings(leagueId, competitionId, seasonYear, round);
        if (rows.isEmpty()) {
            return List.of();
        }

        record Row(UUID userId, int gameweekPoints, int predictionsCount) {
        }

        List<Row> mapped = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            UUID userId = (UUID) r[0];
            int gameweekPoints = ((Number) r[1]).intValue();
            int predictionsCount = ((Number) r[2]).intValue();
            mapped.add(new Row(userId, gameweekPoints, predictionsCount));
        }

        Comparator<Row> byPointsDesc = Comparator.comparingInt(Row::gameweekPoints).reversed();
        Comparator<Row> byUserIdAsc = Comparator.comparing((Row r) -> r.userId().toString());
        mapped.sort(byPointsDesc.thenComparing(byUserIdAsc));

        Map<UUID, String> usernames = userRepo.findAllById(mapped.stream().map(Row::userId).toList())
                .stream()
                .collect(Collectors.toMap(User::getId, User::getUsername, (a, b) -> a, HashMap::new));

        List<GameweekStandingsRowResponse> out = new ArrayList<>(mapped.size());
        int rank = 0;
        int index = 0;
        Integer lastPoints = null;
        for (Row row : mapped) {
            index++;
            // Competition-style ranks: ties share, next skips (1, 2, 2, 4).
            if (lastPoints == null || row.gameweekPoints() != lastPoints) {
                rank = index;
                lastPoints = row.gameweekPoints();
            }
            String username = usernames.getOrDefault(row.userId(), "");
            out.add(new GameweekStandingsRowResponse(
                    row.userId(),
                    username,
                    row.gameweekPoints(),
                    row.predictionsCount(),
                    rank
            ));
        }
        return out;
    }
}
