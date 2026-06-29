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
        } else {
            final List<FixturesResponse.FixtureRow> rows = response.get().response();
            for (FixturesResponse.FixtureRow row : rows) {
                upsertFixture(row, competitionId, season);
            }
            log.info("syncLiveAndRecent: competition={} fixtures={}", competitionId, rows.size());
        }

        // Settle anything now final but not yet scored — including fixtures whose
        // final status was first recorded by syncUpcoming, or that we missed while
        // they overran the live window. Path-independent so points never strand.
        settlePendingFixtures(competition);
    }

    @Override
    @Transactional
    public void syncUpcoming(Competition competition) {
        final Long competitionId = competition.getId();
        final Integer season = competition.getSeasonYear();
        log.info("syncUpcoming: competition={} season={}", competitionId, season);

        // Fetch the full season's fixtures (not just the next N). A tournament
        // can have more fixtures than any small window would cover, and team
        // discovery for squad sync derives teams from the fixtures we hold, so
        // an incomplete fixture set silently drops whole teams (and therefore
        // their players) from predictions. One call per competition either way.
        final Optional<FixturesResponse> response = client.fetchSeasonFixtures(competitionId, season);

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

        // This full-season pass routinely marks matches final (every 6h, no
        // window gating), so settle them here too — otherwise their points would
        // never be computed.
        settlePendingFixtures(competition);
    }

    @Override
    @Transactional
    public void settlePendingFixtures(Competition competition) {
        final Long competitionId = competition.getId();
        final Integer season = competition.getSeasonYear();

        final List<Fixture> pending = fixtureRepository
                .findByCompetitionIdAndSeasonYearAndStatusInAndSettledAtIsNull(
                        competitionId, season, FixtureStatus.FINAL);

        if (pending.isEmpty()) {
            return;
        }

        int dispatched = 0;
        for (Fixture fixture : pending) {
            // Admin-corrected fixtures are settled out-of-band by the manual
            // edit path; never re-fetch their events or re-dispatch scoring.
            if (fixture.isManuallyOverridden()) {
                continue;
            }
            // If the budget is exhausted we skip dispatch so the fixture stays
            // pending and is retried later, rather than settling it with no events
            // and locking in zero scorer/assister points.
            final boolean eventsFetched = syncEventsForFixture(fixture.getId());
            if (!eventsFetched) {
                continue;
            }
            eventPublisher.publishEvent(new FixtureSettledEvent(fixture.getId()));
            dispatched++;
        }

        log.info("settlePendingFixtures: competition={} season={} pending={} dispatched={}",
                competitionId, season, pending.size(), dispatched);

        // Season-settled detection: if we just settled the last outstanding
        // fixture(s), tell the overall-prediction scorer the season is done.
        if (dispatched > 0) {
            final long remaining = fixtureRepository.countByCompetitionIdAndSeasonYearAndStatusIn(
                    competitionId, season, UNFINISHED_STATUSES);
            if (remaining == 0) {
                log.info("settlePendingFixtures: competition={} season={} all fixtures settled; "
                        + "publishing SeasonSettledEvent", competitionId, season);
                eventPublisher.publishEvent(new SeasonSettledEvent(competitionId, season));
            }
        }
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

        // An admin has manually corrected this fixture — never let the sync
        // overwrite the corrected score/status/events with upstream data.
        if (existing.map(Fixture::isManuallyOverridden).orElse(false)) {
            log.debug("Skipping fixture {}: manually overridden by admin", fixtureId);
            return null;
        }

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
        final Integer penaltyHome = resolvePenaltyScore(row, true);
        final Integer penaltyAway = resolvePenaltyScore(row, false);

        fixture.setHomeScore(homeScore);
        fixture.setAwayScore(awayScore);
        fixture.setPenaltyHomeScore(penaltyHome);
        fixture.setPenaltyAwayScore(penaltyAway);
        fixture.setWinnerTeamId(resolveWinnerTeamId(fixture, homeScore, awayScore, penaltyHome, penaltyAway, newStatus));
        fixture.setLastSyncedAt(LocalDateTime.now());

        fixtureRepository.save(fixture);

        boolean transitionedToFinal = newStatus.isFinal() && !wasPreviouslyFinal && !wasAlreadySettled;
        return new UpsertResult(fixtureId, transitionedToFinal);
    }

    /**
     * @return true if events were successfully fetched from the API (even if the
     *         match had zero goals); false if the call was skipped/failed (e.g.
     *         budget exhausted), in which case the caller should not settle yet.
     */
    private boolean syncEventsForFixture(Long fixtureId) {
        final Optional<FixtureEventsResponse> response = client.fetchFixtureEvents(fixtureId);

        if (response.isEmpty() || response.get().response() == null) {
            log.info("syncEventsForFixture: no events response for fixture={} (budget or error)", fixtureId);
            return false;
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
        return true;
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
        // Prefer the top-level goals — the final result after extra time, excluding
        // the penalty shootout — so a knockout match stores its 120' result rather
        // than the 90' fulltime score. Fall back to fulltime only when goals is
        // absent (e.g. a not-yet-started fixture API quirk).
        if (row.goals() != null) {
            final Integer value = home ? row.goals().home() : row.goals().away();
            if (value != null) {
                return value;
            }
        }

        if (row.score() != null && row.score().fulltime() != null) {
            return home ? row.score().fulltime().home() : row.score().fulltime().away();
        }

        return null;
    }

    private Integer resolvePenaltyScore(FixturesResponse.FixtureRow row, boolean home) {
        if (row.score() != null && row.score().penalty() != null) {
            return home ? row.score().penalty().home() : row.score().penalty().away();
        }
        return null;
    }

    private Long resolveWinnerTeamId(Fixture fixture,
                                     Integer homeScore,
                                     Integer awayScore,
                                     Integer penaltyHome,
                                     Integer penaltyAway,
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

        // Level after 120' (extra time) — the tie was decided on penalties. The
        // team with the higher shootout score advances and is the fixture winner.
        if (status == FixtureStatus.PEN && penaltyHome != null && penaltyAway != null) {
            if (penaltyHome > penaltyAway) {
                return fixture.getHomeTeamId();
            }
            if (penaltyAway > penaltyHome) {
                return fixture.getAwayTeamId();
            }
        }

        return null;
    }

    private record UpsertResult(Long fixtureId, boolean transitionedToFinal) {
    }
}
