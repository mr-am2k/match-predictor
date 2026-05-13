package byteblaze.backend.fixture.service;

import byteblaze.backend.competition.entity.Competition;
import byteblaze.backend.fixture.entity.Fixture;
import byteblaze.backend.fixture.entity.FixtureEvent;
import byteblaze.backend.fixture.entity.FixtureEventType;
import byteblaze.backend.fixture.entity.FixtureStatus;
import byteblaze.backend.fixture.event.FixtureSettledEvent;
import byteblaze.backend.fixture.repository.FixtureEventRepository;
import byteblaze.backend.fixture.repository.FixtureRepository;
import byteblaze.backend.overall.event.SeasonSettledEvent;
import byteblaze.backend.sync.client.ApiFootballClient;
import byteblaze.backend.sync.client.dto.FixtureEventsResponse;
import byteblaze.backend.sync.client.dto.FixturesResponse;
import byteblaze.backend.team.service.TeamSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class FixtureSyncServiceImpl implements FixtureSyncService {

    private static final String GOAL_TYPE = "Goal";

    /** Statuses indicating a fixture has NOT reached a terminal state (final or cancelled). */
    private static final Set<FixtureStatus> UNFINISHED_STATUSES;

    static {
        EnumSet<FixtureStatus> unfinished = EnumSet.allOf(FixtureStatus.class);
        unfinished.removeAll(FixtureStatus.FINAL);
        unfinished.removeAll(FixtureStatus.CANCELLED);
        UNFINISHED_STATUSES = unfinished;
    }

    private final FixtureRepository fixtureRepository;
    private final FixtureEventRepository fixtureEventRepository;
    private final ApiFootballClient client;
    private final ApplicationEventPublisher eventPublisher;
    private final TeamSyncService teamSyncService;

    @Override
    @Transactional
    public void syncLiveAndRecent(final Competition competition) {
        final Long competitionId = competition.getId();
        final Integer season = competition.getSeasonYear();

        log.info("syncLiveAndRecent: competition={} season={}", competitionId, season);

        final Optional<FixturesResponse> response = client.fetchFixturesForDate(
                competitionId, season, LocalDate.now());

        if (response.isEmpty() || response.get().response() == null) {
            log.info("syncLiveAndRecent: no response for competition={} (budget or error)", competitionId);
            return;
        }

        final List<FixturesResponse.FixtureRow> rows = response.get().response();
        final List<Long> newlyFinalFixtureIds = new ArrayList<>();

        for (FixturesResponse.FixtureRow row : rows) {
            final UpsertResult result = upsertFixture(row, competitionId, season);

            if (result != null && result.transitionedToFinal) {
                newlyFinalFixtureIds.add(result.fixtureId);
            }
        }

        log.info("syncLiveAndRecent: competition={} fixtures={} newly-final={}",
                competitionId, rows.size(), newlyFinalFixtureIds.size());

        for (Long fixtureId : newlyFinalFixtureIds) {
            syncEventsForFixture(fixtureId);
            eventPublisher.publishEvent(new FixtureSettledEvent(fixtureId));
        }

        // Season-settled detection: if this sync produced at least one final
        // transition AND there are now zero unfinished fixtures for this
        // (competition, season), publish a SeasonSettledEvent so the
        // overall-prediction scoring listener can run.
        if (!newlyFinalFixtureIds.isEmpty()) {
            long remaining = fixtureRepository.countByCompetitionIdAndSeasonYearAndStatusIn(
                    competitionId, season, UNFINISHED_STATUSES);

            if (remaining == 0) {
                log.info("syncLiveAndRecent: competition={} season={} all fixtures settled; "
                        + "publishing SeasonSettledEvent", competitionId, season);
                eventPublisher.publishEvent(new SeasonSettledEvent(competitionId, season));
            }
        }
    }

    @Override
    @Transactional
    public void syncUpcoming(Competition competition) {
        final Long competitionId = competition.getId();
        final Integer season = competition.getSeasonYear();
        log.info("syncUpcoming: competition={} season={}", competitionId, season);

        final Optional<FixturesResponse> response = client.fetchUpcomingFixtures(competitionId, season);

        if (response.isEmpty() || response.get().response() == null) {
            log.info("syncUpcoming: no response for competition={} (budget or error)", competitionId);
            return;
        }

        final List<FixturesResponse.FixtureRow> rows = response.get().response();
        int updated = 0;

        for (FixturesResponse.FixtureRow row : rows) {
            UpsertResult result = upsertFixture(row, competitionId, season);
            if (result != null) {
                updated++;
            }
        }

        log.info("syncUpcoming: competition={} upserted={}", competitionId, updated);
    }

    private UpsertResult upsertFixture(FixturesResponse.FixtureRow row,
                                       Long competitionId,
                                       Integer seasonYear) {
        if (row == null || row.fixture() == null || row.fixture().id() == null) {
            return null;
        }

        final Long fixtureId = row.fixture().id();
        final FixtureStatus newStatus = mapStatus(row);

        if (newStatus == null) {
            log.warn("Skipping fixture {}: unrecognised status", fixtureId);
            return null;
        }

        final Optional<Fixture> existing = fixtureRepository.findById(fixtureId);

        boolean wasPreviouslyFinal = existing
                .map(f -> f.getStatus() != null && f.getStatus().isFinal())
                .orElse(false);

        boolean wasAlreadySettled = existing
                .map(f -> f.getSettledAt() != null)
                .orElse(false);

        final Fixture fixture = existing.orElseGet(Fixture::new);

        fixture.setId(fixtureId);
        fixture.setCompetitionId(competitionId);
        fixture.setSeasonYear(seasonYear);
        fixture.setRound(row.league() != null
                ? client.extractRoundString(row.league().round())
                : fixture.getRound());
        final OffsetDateTime kickoff = parseKickoff(row.fixture().date());

        if (kickoff != null) {
            fixture.setKickoffAt(kickoff);
        }

        fixture.setStatus(newStatus);

        FixturesResponse.TeamRef homeRef = row.teams() != null ? row.teams().home() : null;
        FixturesResponse.TeamRef awayRef = row.teams() != null ? row.teams().away() : null;

        if (homeRef != null && homeRef.id() != null) {
            teamSyncService.ensureTeamStub(homeRef.id(), homeRef.name(), homeRef.logo());
        }

        if (awayRef != null && awayRef.id() != null) {
            teamSyncService.ensureTeamStub(awayRef.id(), awayRef.name(), awayRef.logo());
        }

        fixture.setHomeTeamId(homeRef != null ? homeRef.id() : fixture.getHomeTeamId());
        fixture.setAwayTeamId(awayRef != null ? awayRef.id() : fixture.getAwayTeamId());

        final Integer homeScore = resolveScore(row, true);
        final Integer awayScore = resolveScore(row, false);

        fixture.setHomeScore(homeScore);
        fixture.setAwayScore(awayScore);
        fixture.setWinnerTeamId(resolveWinnerTeamId(fixture, homeScore, awayScore, newStatus));
        fixture.setLastSyncedAt(LocalDateTime.now());

        fixtureRepository.save(fixture);

        boolean transitionedToFinal = newStatus.isFinal() && !wasPreviouslyFinal && !wasAlreadySettled;
        return new UpsertResult(fixtureId, transitionedToFinal);
    }

    private void syncEventsForFixture(Long fixtureId) {
        final Optional<FixtureEventsResponse> response = client.fetchFixtureEvents(fixtureId);

        if (response.isEmpty() || response.get().response() == null) {
            log.info("syncEventsForFixture: no events response for fixture={} (budget or error)", fixtureId);
            return;
        }

        fixtureEventRepository.deleteByFixtureId(fixtureId);

        final List<FixtureEvent> toInsert = new ArrayList<>();

        for (FixtureEventsResponse.EventRow event : response.get().response()) {
            if (event == null || event.type() == null) {
                continue;
            }

            if (!GOAL_TYPE.equalsIgnoreCase(event.type())) {
                continue;
            }

            if (event.player() == null || event.player().id() == null || event.team() == null) {
                continue;
            }

            final Integer minute = event.time() != null ? event.time().elapsed() : null;

            final FixtureEvent goal = FixtureEvent.builder()
                    .fixtureId(fixtureId)
                    .playerId(event.player().id())
                    .teamId(event.team().id())
                    .type(FixtureEventType.GOAL)
                    .minute(minute)
                    .detail(event.detail())
                    .build();
            toInsert.add(goal);

            if (event.assist() != null && event.assist().id() != null) {
                FixtureEvent assist = FixtureEvent.builder()
                        .fixtureId(fixtureId)
                        .playerId(event.assist().id())
                        .teamId(event.team().id())
                        .type(FixtureEventType.ASSIST)
                        .minute(minute)
                        .detail(event.detail())
                        .build();
                toInsert.add(assist);
            }
        }

        if (!toInsert.isEmpty()) {
            fixtureEventRepository.saveAll(toInsert);
        }

        log.info("syncEventsForFixture: fixture={} events-stored={}", fixtureId, toInsert.size());
    }

    private FixtureStatus mapStatus(FixturesResponse.FixtureRow row) {
        if (row.fixture() == null || row.fixture().status() == null) {
            return null;
        }

        final String code = row.fixture().status().shortCode();

        if (code == null) {
            return null;
        }

        try {
            return FixtureStatus.fromApiCode(code);
        } catch (IllegalArgumentException e) {
            log.warn("Unknown fixture status code from API: {}", code);
            return null;
        }
    }

    private OffsetDateTime parseKickoff(String iso) {
        if (iso == null) {
            return null;
        }

        try {
            return OffsetDateTime.parse(iso);
        } catch (Exception e) {
            log.warn("Failed to parse fixture date {}: {}", iso, e.getMessage());
            return null;
        }
    }

    private Integer resolveScore(FixturesResponse.FixtureRow row, boolean home) {
        if (row.score() != null && row.score().fulltime() != null) {
            final Integer value = home ? row.score().fulltime().home() : row.score().fulltime().away();
            if (value != null) {
                return value;
            }
        }

        if (row.goals() != null) {
            return home ? row.goals().home() : row.goals().away();
        }

        return null;
    }

    private Long resolveWinnerTeamId(Fixture fixture,
                                     Integer homeScore,
                                     Integer awayScore,
                                     FixtureStatus status) {
        if (!status.isFinal() || homeScore == null || awayScore == null) {
            return null;
        }

        if (homeScore > awayScore) {
            return fixture.getHomeTeamId();
        }

        if (awayScore > homeScore) {
            return fixture.getAwayTeamId();
        }

        return null;
    }

    private record UpsertResult(Long fixtureId, boolean transitionedToFinal) {
    }
}
