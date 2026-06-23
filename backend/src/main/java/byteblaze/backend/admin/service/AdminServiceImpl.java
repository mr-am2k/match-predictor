package byteblaze.backend.admin.service;

import byteblaze.backend.admin.dto.*;
import byteblaze.backend.auth.entity.User;
import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.competition.exception.CompetitionNotFoundException;
import byteblaze.backend.competition.repository.CompetitionRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.league.dto.LeagueResponse;
import byteblaze.backend.league.entity.League;
import byteblaze.backend.league.repository.LeagueMembershipRepository;
import byteblaze.backend.league.repository.LeagueRepository;
import byteblaze.backend.league.service.LeagueService;
import byteblaze.backend.sync.budget.ApiCallLog;
import byteblaze.backend.sync.budget.ApiCallLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminServiceImpl implements AdminService {

    private final CompetitionRepository competitionRepository;
    private final LeagueRepository leagueRepository;
    private final LeagueMembershipRepository membershipRepository;
    private final FixtureRepository fixtureRepository;
    private final ApiCallLogRepository apiCallLogRepository;
    private final LeagueService leagueService;

    @Override
    public List<AdminCompetitionResponse> listCompetitions() {
        return competitionRepository.findAll().stream()
                .sorted(Comparator.comparing(Competition::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(this::toCompetitionResponse)
                .toList();
    }

    @Override
    public AdminCompetitionResponse patchCompetition(final Long id, final PatchCompetitionRequest patchCompetitionRequest) {
        Competition competition = competitionRepository.findById(id)
                .orElseThrow(() -> new CompetitionNotFoundException("Competition not found: " + id));

        if (patchCompetitionRequest.active() != null) {
            competition.setActive(patchCompetitionRequest.active());
            competition = competitionRepository.save(competition);
            log.info("Admin set competition={} active={}", id, patchCompetitionRequest.active());
        }

        return toCompetitionResponse(competition);
    }

    @Override
    public Page<AdminLeagueResponse> listLeagues(String search, Boolean archived, int page, int size) {
        final Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        final String normalizedSearch = (search == null || search.isBlank())
                ? null
                : search.trim().toLowerCase();

        final Page<League> pageResult = leagueRepository.findAdminLeagues(normalizedSearch, archived, pageable);

        return pageResult.map(this::toLeagueResponse);
    }

    @Override
    public AdminLeagueResponse patchLeague(UUID id, PatchLeagueRequest body, User currentUser) {
        if (body.archived() != null) {
            final LeagueResponse response = leagueService.archive(id, body.archived(), currentUser);

            log.info("Admin set league={} archived={}", id, body.archived());

            // Reload with the archived value and full details for the admin response
            final League league = leagueRepository.findById(response.id())
                    .orElseThrow();

            return toLeagueResponse(league);
        }

        final League league = leagueRepository.findById(id)
                .orElseThrow();

        return toLeagueResponse(league);
    }

    @Override
    public List<ApiCallLogEntry> recentLog(int limit) {
        final Pageable pageable = PageRequest.of(0, Math.max(1, limit));

        return apiCallLogRepository.findAllByOrderByCalledAtDesc(pageable).stream()
                .map(this::toLogEntry)
                .toList();
    }

    private AdminCompetitionResponse toCompetitionResponse(Competition c) {
        long totalLeagues = leagueRepository.countByCompetitionId(c.getId());
        long activeLeagues = leagueRepository.countByCompetitionIdAndArchivedFalse(c.getId());
        long fixtureCount = fixtureRepository.countByCompetitionIdAndSeasonYear(
                c.getId(), c.getSeasonYear());

        return new AdminCompetitionResponse(
                c.getId(),
                c.getName(),
                c.getType(),
                c.getLogoUrl(),
                c.getCountryName(),
                c.getSeasonYear(),
                c.isActive(),
                c.getLastSyncedAt(),
                totalLeagues,
                activeLeagues,
                fixtureCount
        );
    }

    private AdminLeagueResponse toLeagueResponse(League league) {
        long memberCount = membershipRepository.countByLeagueId(league.getId());
        return new AdminLeagueResponse(
                league.getId(),
                league.getName(),
                league.getVisibility().name(),
                league.getCompetition().getName(),
                league.getSeasonYear(),
                league.getOwner().getUsername(),
                memberCount,
                league.isArchived(),
                league.getCreatedAt()
        );
    }

    private ApiCallLogEntry toLogEntry(ApiCallLog log) {
        return new ApiCallLogEntry(
                log.getId(),
                log.getCalledAt(),
                log.getEndpoint(),
                log.getCompetitionId(),
                log.getStatusCode(),
                log.getNote()
        );
    }
}
