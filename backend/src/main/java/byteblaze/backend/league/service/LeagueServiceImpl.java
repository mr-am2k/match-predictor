package byteblaze.backend.league.service;

import byteblaze.backend.auth.entity.Role;
import byteblaze.backend.auth.entity.User;
import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.exception.CompetitionInactiveException;
import byteblaze.backend.competition.exception.CompetitionNotFoundException;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.league.dto.CompetitionSummary;
import byteblaze.backend.league.dto.CreateLeagueRequest;
import byteblaze.backend.league.dto.JoinResult;
import byteblaze.backend.league.dto.LeagueBrowseResponse;
import byteblaze.backend.league.dto.LeagueMemberResponse;
import byteblaze.backend.league.dto.LeagueResponse;
import byteblaze.backend.league.dto.LeagueSummaryResponse;
import byteblaze.backend.league.dto.LeagueSyncResponse;
import byteblaze.backend.league.dto.OwnerSummary;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.entity.LeagueMembership;
import byteblaze.backend.league.entity.LeagueVisibility;
import byteblaze.backend.league.entity.MembershipRole;
import byteblaze.backend.league.event.LeagueCreatedEvent;
import byteblaze.backend.league.exception.JoinCodeGenerationException;
import byteblaze.backend.league.exception.LeagueAccessDeniedException;
import byteblaze.backend.league.exception.LeagueJoinCodeNotFoundException;
import byteblaze.backend.league.exception.LeagueNotFoundException;
import byteblaze.backend.league.exception.LeagueNotPublicException;
import byteblaze.backend.league.repository.LeagueMembershipRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.competition.exception.CompetitionNotFoundException;
import byteblaze.backend.scoring.rules.service.LeagueScoringRulesService;
import byteblaze.backend.sync.budget.ApiCallBudget;
import byteblaze.backend.sync.orchestrator.SyncOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeagueServiceImpl implements LeagueService {

    private static final int MAX_JOIN_CODE_ATTEMPTS = 5;

    /** Minimum gap between owner-triggered manual syncs for the same competition. */
    private static final long MANUAL_SYNC_COOLDOWN_SECONDS = 60;

    private final LeagueRepository leagueRepository;
    private final LeagueMembershipRepository membershipRepository;
    private final CompetitionRepository competitionRepository;
    private final JoinCodeGenerator joinCodeGenerator;
    private final ApplicationEventPublisher eventPublisher;
    private final LeagueScoringRulesService scoringRulesService;
    private final SyncOrchestrator syncOrchestrator;
    private final ApiCallBudget budget;

    /** Last manual-sync time per competition id; throttles the owner button. */
    private final Map<Long, Instant> lastManualSyncByCompetition = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public LeagueResponse createLeague(CreateLeagueRequest request, User currentUser) {
        final Competition competition = competitionRepository.findById(request.competitionId())
                .orElseThrow(() -> new CompetitionNotFoundException(
                        "Competition not found: " + request.competitionId()));

        if (!competition.isActive()) {
            throw new CompetitionInactiveException(
                    "Competition is not active: " + request.competitionId());
        }

        String joinCode = null;

        if (request.visibility() == LeagueVisibility.PRIVATE) {
            joinCode = generateUniqueJoinCode();
        }

         League league = League.builder()
                .name(request.name().trim())
                .visibility(request.visibility())
                .joinCode(joinCode)
                .competition(competition)
                .seasonYear(competition.getSeasonYear())
                .owner(currentUser)
                .build();
        league = leagueRepository.save(league);

        final LeagueMembership ownerMembership = LeagueMembership.builder()
                .league(league)
                .user(currentUser)
                .role(MembershipRole.OWNER)
                .build();

        membershipRepository.save(ownerMembership);

        if (request.scoringRules() != null) {
            scoringRulesService.createFromRequest(league.getId(), request.scoringRules());
        } else {
            scoringRulesService.createDefaults(league.getId());
        }

        log.info("Publishing LeagueCreatedEvent: leagueId={} competitionId={}", league.getId(), competition.getId());
        eventPublisher.publishEvent(new LeagueCreatedEvent(league.getId(), competition.getId()));

        return toResponse(league, competition, currentUser, 1L, true);
    }

    @Override
    @Transactional(readOnly = true)
    public LeagueResponse getLeague(UUID leagueId, User currentUser) {
        final League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        boolean isMember = membershipRepository.existsByLeagueIdAndUserId(leagueId, currentUser.getId());

        if (league.getVisibility() == LeagueVisibility.PRIVATE && !isMember) {
            throw new LeagueAccessDeniedException("You do not have access to this league");
        }

        return buildLeagueResponse(league, currentUser);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeagueSummaryResponse> getLeaguesForUser(User currentUser) {
        return getLeaguesForUser(currentUser, false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeagueSummaryResponse> getLeaguesForUser(User currentUser, boolean includeArchived) {
        final List<LeagueMembership> memberships =
                membershipRepository.findAllByUserIdWithLeague(currentUser.getId(), includeArchived);

        return memberships.stream()
                .map(membership -> {
                    League league = membership.getLeague();
                    long memberCount = membershipRepository.countByLeagueId(league.getId());
                    return new LeagueSummaryResponse(
                            league.getId(),
                            league.getName(),
                            league.getVisibility(),
                            toCompetitionSummary(league.getCompetition()),
                            membership.getRole(),
                            memberCount
                    );
                })
                .toList();
    }

    @Override
    @Transactional
    public JoinResult joinByCode(String code, User currentUser) {
        final String trimmed = code.trim();
        final League league = leagueRepository.findByJoinCodeIgnoreCase(trimmed)
                .orElseThrow(() -> new LeagueJoinCodeNotFoundException(trimmed));

        return joinLeague(league, currentUser);
    }

    @Override
    @Transactional
    public JoinResult joinPublic(UUID leagueId, User currentUser) {
        final League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        if (league.getVisibility() != LeagueVisibility.PUBLIC) {
            throw new LeagueNotPublicException(leagueId);
        }

        return joinLeague(league, currentUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LeagueBrowseResponse> browsePublicLeagues(
            Long competitionId,
            String search,
            int page,
            int size,
            User currentUser
    ) {
        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        String normalizedSearch = (search == null || search.isBlank())
                ? null
                : search.trim().toLowerCase();

        Page<League> pageResult =
                leagueRepository.findPublicLeagues(competitionId, normalizedSearch, pageable);

        final List<League> leagues = pageResult.getContent();
        if (leagues.isEmpty()) {
            return pageResult.map(league -> toBrowseResponse(league, 0L, false));
        }

        final List<UUID> leagueIds = leagues.stream().map(League::getId).toList();

        final Map<UUID, Long> memberCountByLeagueId = new HashMap<>();

        for (Object[] row : membershipRepository.countMembersByLeagueIds(leagueIds)) {
            memberCountByLeagueId.put((UUID) row[0], ((Number) row[1]).longValue());
        }

        Set<UUID> joinedLeagueIds = new HashSet<>(
                membershipRepository.findLeagueIdsByUserId(currentUser.getId())
        );

        return pageResult.map(league -> toBrowseResponse(
                league,
                memberCountByLeagueId.getOrDefault(league.getId(), 0L),
                joinedLeagueIds.contains(league.getId())
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeagueMemberResponse> listMembers(UUID leagueId, User currentUser) {
        final League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        boolean isMember = membershipRepository.existsByLeagueIdAndUserId(leagueId, currentUser.getId());

        if (!isMember) {
            throw new LeagueAccessDeniedException("You do not have access to this league");
        }

        final List<LeagueMembership> memberships = membershipRepository.findByLeagueWithUser(league);

        return memberships.stream()
                .sorted(Comparator
                        .comparing((LeagueMembership m) -> m.getRole() == MembershipRole.OWNER ? 0 : 1)
                        .thenComparing(LeagueMembership::getJoinedAt))
                .map(m -> new LeagueMemberResponse(
                        m.getUser().getId(),
                        m.getUser().getUsername(),
                        m.getRole().name(),
                        m.getJoinedAt()
                ))
                .toList();
    }

    @Override
    @Transactional
    public LeagueResponse archive(UUID leagueId, boolean archived, User currentUser) {
        League league = leagueRepository.findById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        boolean isOwner = league.getOwner().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new LeagueAccessDeniedException("You do not have permission to archive this league");
        }

        league.setArchived(archived);
        league = leagueRepository.save(league);

        log.info("League archive={} set to {} by user={}", leagueId, archived, currentUser.getId());

        return buildLeagueResponse(league, currentUser);
    }

    @Override
    public LeagueSyncResponse triggerSync(UUID leagueId, User currentUser) {
        // Owner (or platform admin) only. Read the owner id directly to avoid
        // pulling the whole League graph just for an authorization check.
        final UUID ownerId = leagueRepository.findOwnerIdById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        boolean isOwner = ownerId.equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new LeagueAccessDeniedException("Only the league owner can trigger a sync");
        }

        final Long competitionId = leagueRepository.findCompetitionIdById(leagueId)
                .orElseThrow(() -> new LeagueNotFoundException("League not found: " + leagueId));

        // Throttle: many leagues share one competition, so cooldown by competition.
        final Instant now = Instant.now();
        final Instant last = lastManualSyncByCompetition.get(competitionId);
        if (last != null && last.plusSeconds(MANUAL_SYNC_COOLDOWN_SECONDS).isAfter(now)) {
            long retryIn = MANUAL_SYNC_COOLDOWN_SECONDS - (now.getEpochSecond() - last.getEpochSecond());
            return new LeagueSyncResponse(
                    false,
                    "This competition was just synced. Try again in " + retryIn + "s.",
                    budget.getUsedLast24h(),
                    budget.getDailyLimit()
            );
        }

        final Competition competition = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new CompetitionNotFoundException("Competition not found: " + competitionId));

        lastManualSyncByCompetition.put(competitionId, now);
        log.info("Owner-triggered sync: league={} competition={} by user={}",
                leagueId, competitionId, currentUser.getId());

        syncOrchestrator.refreshFixturesNow(competition);

        return new LeagueSyncResponse(
                true,
                "Match data refreshed.",
                budget.getUsedLast24h(),
                budget.getDailyLimit()
        );
    }

    private JoinResult joinLeague(League league, User currentUser) {
        boolean alreadyMember =
                membershipRepository.existsByLeagueIdAndUserId(league.getId(), currentUser.getId());

        if (alreadyMember) {
            return new JoinResult(buildLeagueResponse(league, currentUser), false);
        }

        LeagueMembership membership = LeagueMembership.builder()
                .league(league)
                .user(currentUser)
                .role(MembershipRole.MEMBER)
                .build();
        membershipRepository.save(membership);

        return new JoinResult(buildLeagueResponse(league, currentUser), true);
    }

    private LeagueResponse buildLeagueResponse(League league, User currentUser) {
        boolean isOwner = league.getOwner().getId().equals(currentUser.getId());
        long memberCount = membershipRepository.countByLeagueId(league.getId());
        return toResponse(league, league.getCompetition(), league.getOwner(), memberCount, isOwner);
    }

    private LeagueBrowseResponse toBrowseResponse(League league, long memberCount, boolean joined) {
        return new LeagueBrowseResponse(
                league.getId(),
                league.getName(),
                toCompetitionSummary(league.getCompetition()),
                new OwnerSummary(league.getOwner().getId(), league.getOwner().getUsername()),
                league.getSeasonYear(),
                memberCount,
                league.getCreatedAt(),
                joined
        );
    }

    private String generateUniqueJoinCode() {
        for (int attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
            String candidate = joinCodeGenerator.generate();
            if (!leagueRepository.existsByJoinCode(candidate)) {
                return candidate;
            }
        }
        throw new JoinCodeGenerationException(
                "Unable to generate a unique join code after " + MAX_JOIN_CODE_ATTEMPTS + " attempts");
    }

    private LeagueResponse toResponse(
            League league,
            Competition competition,
            User owner,
            long memberCount,
            boolean includeJoinCode
    ) {
        return new LeagueResponse(
                league.getId(),
                league.getName(),
                league.getVisibility(),
                includeJoinCode ? league.getJoinCode() : null,
                toCompetitionSummary(competition),
                new OwnerSummary(owner.getId(), owner.getUsername()),
                memberCount,
                league.getCreatedAt()
        );
    }

    private CompetitionSummary toCompetitionSummary(Competition competition) {
        return new CompetitionSummary(
                competition.getId(),
                competition.getName(),
                competition.getLogoUrl(),
                competition.getCountryName(),
                competition.getCountryFlagUrl(),
                competition.getSeasonYear()
        );
    }
}
