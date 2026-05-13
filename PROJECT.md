# Match Predictor — Project Reference

The single source of truth for what's built, how it works, and where to find the code. Phase plans in `.claude/` are the history; this document is the current state.

> **Status snapshot:** Phases 1–3 are merged. Phase 4's per-fixture locks and score-driven pick caps are shipped. **Pick counts** (each scorer/assister pick carries a predicted goal/assist count, V12) are shipped on top. The browse-leagues 500 fix and Phase 3's notifications subsystem remain unshipped. See §15.

---

## Table of contents

1. [Overview & goals](#1-overview--goals)
2. [Tech stack](#2-tech-stack)
3. [Repository structure](#3-repository-structure)
4. [Database schema](#4-database-schema)
5. [Authentication & authorization](#5-authentication--authorization)
6. [API-Football integration & sync](#6-api-football-integration--sync)
7. [Domain model — teams, players, fixtures, events](#7-domain-model--teams-players-fixtures-events)
8. [Leagues — creation, joining, browsing, archival](#8-leagues--creation-joining-browsing-archival)
9. [Match predictions](#9-match-predictions)
10. [Season-end (overall) predictions](#10-season-end-overall-predictions)
11. [Scoring engine & per-league rules](#11-scoring-engine--per-league-rules)
12. [Standings](#12-standings)
13. [Admin surface](#13-admin-surface)
14. [HTTP API summary](#14-http-api-summary)
15. [Known gaps & planned work](#15-known-gaps--planned-work)
16. [Configuration reference](#16-configuration-reference)
17. [Running locally](#17-running-locally)
18. [Glossary](#18-glossary)

---

## 1. Overview & goals

**Match Predictor** is a full-stack football/soccer prediction game. An authenticated user can:

- Pick an admin-whitelisted **Competition** (Premier League, Serie A, World Cup, …).
- Create or join a **League** built on top of that Competition. Leagues are private (join code) or public (browseable).
- Predict every match in a gameweek: winner / draw, exact score, scorers, assisters.
- Make one **season-end** prediction per league: competition winner, top scorer, top assister.
- See a live leaderboard. Points accrue as fixtures settle.

**Launch target:** ready for the **2026 FIFA World Cup**.

The architecture bends around one hard constraint: **API-Football's free tier of 100 calls per 24h**. Every sync decision is shaped by that ceiling — see §6.

---

## 2. Tech stack

### Backend

| Component | Technology | Version |
|---|---|---|
| Framework | Spring Boot | 4.0.3 |
| Language | Java (OpenJDK) | 21 |
| ORM | Spring Data JPA / Hibernate | 7.x |
| Database | PostgreSQL (hosted on Supabase) | — |
| Security | Spring Security | 7.0 |
| JWT | JJWT (`io.jsonwebtoken`) | 0.12.6 |
| Validation | Jakarta Validation | bundled |
| Migrations | Flyway | bundled |
| Utility | Lombok | 1.18.x |
| REST client | Spring `RestClient` | bundled |
| Build | Maven | wrapper |

### Frontend

| Component | Technology | Version |
|---|---|---|
| Framework | React | 19.2 |
| Language | TypeScript | 5.9 |
| Build | Vite | 7.x |
| Routing | react-router-dom | 6.x |
| Icons | lucide-react | latest |
| Styling | Tailwind CSS (utility classes used inline) | — |

---

## 3. Repository structure

```
match-predictor/
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/
│       ├── java/byteblaze/backend/
│       │   ├── Application.java              # @SpringBootApplication, @EnableScheduling, @EnableAsync
│       │   ├── admin/                        # Admin CRUD + budget endpoints
│       │   ├── auth/                         # JWT auth, refresh tokens, /me
│       │   ├── competition/                  # Competition catalog + monthly catalog sync
│       │   ├── config/                       # AsyncConfig, RestClientConfiguration, SecurityConfig
│       │   ├── exception/                    # GlobalExceptionHandler (RFC 7807 ProblemDetail)
│       │   ├── fixture/                      # Fixtures + fixture events + per-fixture sync
│       │   ├── league/                       # League entity, membership, join code, archival
│       │   ├── overall/                      # Season-end (league-wide) predictions
│       │   ├── player/                       # Player + squad (TeamPlayer) entities + sync
│       │   ├── prediction/                   # Per-match predictions, scoring engine, standings
│       │   ├── scoring/rules/                # Owner-configurable per-league scoring rules
│       │   ├── sync/                         # API-Football client, budget gate, scheduled tasks
│       │   └── team/                         # Team entity + sync
│       └── resources/
│           ├── application.yml               # Spring config + properties
│           └── db/migration/                 # Flyway V1–V11
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── App.tsx                           # Routes
│       ├── main.tsx                          # Entry point
│       ├── api/                              # Fetch wrappers per resource (auth, leagues, …)
│       ├── components/                       # ui/ + admin/ + leagues/ + predictions/
│       ├── context/AuthContext.tsx           # /me + /refresh fallback (Phase 3)
│       ├── pages/                            # Top-level routes
│       │   └── admin/                        # AdminCompetitions, AdminBudget, AdminLeagues
│       └── types/                            # Shared TS types
├── docker-compose.yaml                       # Multi-container orchestration
├── .env                                      # Environment variables (gitignored)
├── PROJECT.md                                # ← you are here
├── SCORING_SYSTEM.md                         # Per-pick scoring rules spec (source of truth for §11)
└── .claude/                                  # Historical plans + implementation notes
```

---

## 4. Database schema

Two Postgres schemas:

- **`app.*`** — application data the users generate.
- **`external_data.*`** — mirrors of API-Football state.

Eleven Flyway migrations (`backend/src/main/resources/db/migration/`):

| File | Adds |
|---|---|
| `V1__competitions_table.sql` | `external_data.competitions` |
| `V2__users_and_refresh_tokens.sql` | `app.users`, `app.refresh_tokens` |
| `V3__competitions_is_active.sql` | `competitions.is_active BOOLEAN` |
| `V4__leagues.sql` | `app.leagues`, `app.league_memberships` |
| `V5__teams_players_squads.sql` | `external_data.teams`, `players`, `team_players` |
| `V6__fixtures.sql` | `external_data.fixtures`, `fixture_events` |
| `V7__predictions.sql` | `app.predictions`, `prediction_scorers`, `prediction_assisters`, `prediction_scores` |
| `V8__api_call_log.sql` | `external_data.api_call_log` |
| `V9__league_scoring_rules.sql` | `app.league_scoring_rules` + backfill defaults |
| `V10__league_overall_predictions.sql` | `app.league_overall_predictions`, `app.league_overall_scores` |
| `V11__leagues_archived.sql` | `leagues.archived BOOLEAN` + index |
| `V12__prediction_pick_counts.sql` | `prediction_scorers.count`, `prediction_assisters.count` (NOT NULL DEFAULT 1, CHECK ≥ 1) |

### 4.1 `app.users`

```
id          UUID PK
email       VARCHAR(255) UNIQUE NOT NULL
password    VARCHAR(255) NOT NULL          -- BCrypt strength 12
first_name  VARCHAR(100)
last_name   VARCHAR(100)
username    VARCHAR(100) UNIQUE
role        VARCHAR(50) NOT NULL DEFAULT 'USER'   -- USER | ADMIN
created_at, updated_at TIMESTAMP
```

Note: `User.getUsername()` (from `UserDetails`) returns the **email**, not the `username` column. Legacy Phase-1 decision — not refactored.

### 4.2 `app.refresh_tokens`

```
id          UUID PK
token       VARCHAR(255) UNIQUE NOT NULL   -- UUID string
user_id     UUID FK → app.users(id) ON DELETE CASCADE
expiry_date TIMESTAMP NOT NULL              -- now + 7 days at issue
revoked     BOOLEAN NOT NULL DEFAULT FALSE
created_at  TIMESTAMP
```

Indexed on `user_id`.

### 4.3 `external_data.competitions`

```
id               BIGINT PK                  -- API-Football league id
name             VARCHAR(100) NOT NULL
type             VARCHAR(50)
logo_url         VARCHAR(500)
country_name     VARCHAR(100)
country_flag_url VARCHAR(500)
season_year      INT NOT NULL
season_start     DATE
season_end       DATE
is_active        BOOLEAN NOT NULL DEFAULT TRUE   -- V3: admin hide-from-picker switch
last_synced_at   TIMESTAMP
created_at, updated_at TIMESTAMP
```

### 4.4 `app.leagues` & `app.league_memberships`

```
app.leagues
  id              UUID PK (gen_random_uuid)
  name            VARCHAR(100) NOT NULL
  visibility      VARCHAR(20) NOT NULL    -- PUBLIC | PRIVATE
  join_code       VARCHAR(12) UNIQUE      -- NULL for PUBLIC
  competition_id  BIGINT FK → external_data.competitions(id)
  season_year     INT NOT NULL            -- snapshot at creation
  owner_id        UUID FK → app.users(id) ON DELETE RESTRICT
  archived        BOOLEAN NOT NULL DEFAULT FALSE   -- V11
  created_at, updated_at TIMESTAMP

app.league_memberships
  id          UUID PK
  league_id   UUID FK → app.leagues(id) ON DELETE CASCADE
  user_id     UUID FK → app.users(id) ON DELETE CASCADE
  role        VARCHAR(20) NOT NULL        -- OWNER | MEMBER
  joined_at   TIMESTAMP
  UNIQUE (league_id, user_id)
```

The owner gets a `OWNER` membership row in the same transaction as the league.

### 4.5 `external_data.teams`, `players`, `team_players`

```
teams
  id BIGINT PK    name    code    country    logo_url
  last_synced_at    created_at    updated_at

players
  id BIGINT PK    name    photo_url    position    nationality
  last_synced_at    created_at    updated_at

team_players                                              -- season + comp scoped squad
  team_id, player_id, season_year, competition_id   -- composite PK
  removed_at TIMESTAMP                               -- set when API drops them from the squad
```

Why competition-scoped squads: a player can appear in different competitions for the same team (league vs cup). Predictions are competition-scoped, so squads need to be too.

### 4.6 `external_data.fixtures` & `fixture_events`

```
fixtures
  id BIGINT PK                      -- API-Football fixture id
  competition_id BIGINT FK
  season_year INT
  round VARCHAR(100)                -- "Regular Season - 12" — used as gameweek key
  kickoff_at TIMESTAMP WITH TIME ZONE
  status VARCHAR(20)                -- NS, 1H, HT, 2H, ET, P, FT, AET, PEN, PST, CANC, ABD, AWD, WO
  home_team_id, away_team_id BIGINT
  home_score, away_score INT
  winner_team_id BIGINT             -- NULL for draw or unfinished
  last_synced_at TIMESTAMP
  settled_at TIMESTAMP              -- set by scoring engine after consuming this fixture

fixture_events                       -- only GOAL and ASSIST kept; other event types are ignored
  id UUID PK
  fixture_id BIGINT
  player_id BIGINT                  -- scorer / assister
  team_id BIGINT
  type VARCHAR(20)                  -- GOAL | ASSIST
  minute INT
  detail VARCHAR(50)                -- API detail string, e.g. "Normal Goal", "Own Goal", "Penalty"
```

Own goals are stored with `detail = "Own Goal"` and excluded from scorer matching by the scoring engine.

### 4.7 Predictions tables

```
app.predictions                                       -- scalar per-match prediction
  id UUID PK
  user_id, league_id, fixture_id    UNIQUE (user_id, league_id, fixture_id)
  winner_team_id BIGINT             -- NULL for draw or unpredicted
  predicted_draw BOOLEAN            -- disambiguates "draw" from "no pick"
  home_score, away_score INT        -- nullable
  created_at, updated_at TIMESTAMP

app.prediction_scorers
  prediction_id UUID FK ON DELETE CASCADE
  player_id BIGINT
  count INT NOT NULL DEFAULT 1 CHECK (count >= 1)   -- V12: predicted goals for this player
  PRIMARY KEY (prediction_id, player_id)

app.prediction_assisters                              -- identical shape, separate table
  prediction_id, player_id   PK
  count INT NOT NULL DEFAULT 1 CHECK (count >= 1)   -- V12: predicted assists for this player

app.prediction_scores                                 -- immutable; one row per settled prediction
  prediction_id UUID PK FK
  points INT NOT NULL
  breakdown JSONB NOT NULL          -- {winner, score, scorers:[{playerId,predicted,actual,correct,points}],
                                    --  assisters:[...], categoriesHit, baseTotal, multiplier, total,
                                    --  ruleSetVersion}
  settled_at TIMESTAMP NOT NULL
```

The split between `_scorers` and `_assisters` keeps DELETE/INSERT churn isolated. Per-pick `count` lets a user express "Haaland scores 2, Foden scores 1" as two rows, or "Haaland scores 2" as a single row. Sum of counts per side is capped at the predicted score for that side (see §9.1).

### 4.8 `app.league_scoring_rules` (V9)

One row per league. The `league_id` is both PK and FK.

| Column | Range | Default |
|---|---|---|
| `match_winner_points` | 0..50 | 1 |
| `match_exact_score_points` | 0..50 | 2 |
| `match_scorer_points` | 0..50 | 3 |
| `match_assister_points` | 0..50 | 3 |
| `league_winner_points` | 0..100 | 10 |
| `league_top_scorer_points` | 0..100 | 5 |
| `league_top_assister_points` | 0..100 | 5 |
| `match_bonus_2x` | 1.00..10.00 | 1.50 |
| `match_bonus_3x` | 1.00..10.00 | 2.00 |
| `match_bonus_4x` | 1.00..10.00 | 3.00 |
| `league_bonus_2of3` | 1.00..10.00 | 1.50 |
| `league_bonus_3of3` | 1.00..10.00 | 3.00 |

Constraints enforced at DB level (CHECK), service layer (Bean Validation), and frontend (`types/scoring.ts`).

V9 also backfills a defaults row for every pre-existing league via `ON CONFLICT DO NOTHING`.

### 4.9 `app.league_overall_predictions` & `app.league_overall_scores` (V10)

```
league_overall_predictions
  id UUID PK
  user_id, league_id        UNIQUE (user_id, league_id)
  winner_team_id BIGINT FK → external_data.teams(id) NULLABLE
  top_scorer_player_id BIGINT FK → external_data.players(id) NULLABLE
  top_assister_player_id BIGINT FK → external_data.players(id) NULLABLE

league_overall_scores                       -- written by SeasonSettledListener
  prediction_id UUID PK FK ON DELETE CASCADE
  points INT NOT NULL
  breakdown JSONB NOT NULL                  -- {winner, topScorer, topAssister, categoriesHit,
                                            --  baseTotal, multiplier, total}
  settled_at TIMESTAMP NOT NULL
```

### 4.10 `external_data.api_call_log` (V8)

Every outbound API-Football call writes one row. The 24h count is what the budget gate reads.

```
id UUID PK
called_at TIMESTAMP DEFAULT NOW()
endpoint VARCHAR(100)         -- e.g. "/fixtures", "/players/squads"
competition_id BIGINT
status_code INT
note VARCHAR(200)             -- free text for debugging
```

Indexed on `called_at DESC`.

---

## 5. Authentication & authorization

### 5.1 Token strategy

- **Access token** — short-lived (15 min) JWT signed with HS256. Stored in HttpOnly cookie `access_token`.
- **Refresh token** — long-lived (7 days) UUID string. Stored in `app.refresh_tokens` AND in HttpOnly cookie `refresh_token` (path scoped to `/api/v1/auth/refresh`).

Both cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` is opt-in via env var (off for localhost).

### 5.2 Endpoints (`/api/v1/auth/**`, base `auth/controller/AuthController.java`)

| Method | Path | Auth | Behaviour |
|---|---|---|---|
| POST | `/register` | none | Create user → BCrypt-hash password → issue tokens → set cookies → return `AuthResponse` (201) |
| POST | `/login` | none | Authenticate → revoke prior refresh tokens for this user → issue new tokens → set cookies (200) |
| POST | `/logout` | yes | Revoke all this user's refresh tokens → clear both cookies (204) |
| POST | `/refresh` | refresh cookie | Validate refresh token → issue new access token → set cookie → return `AuthResponse` (200) |
| GET  | `/me` | access cookie | Return the current `AuthResponse` if the cookie is valid (200), else 401 |

`/me` is the key Phase-3 addition. On page reload, `AuthContext.checkAuth()` first calls `/me`; if that 401s it falls back to `/refresh`, which issues a fresh access cookie and returns the user payload directly. Both must fail before the user is sent to `/login`.

### 5.3 `JwtAuthenticationFilter` (`auth/filter/`)

- Extends `OncePerRequestFilter`.
- Pulls the `access_token` cookie, verifies the JWT signature + expiry, loads the user, sets the `SecurityContext`.
- Skips most of `/api/v1/auth/**` (no need to populate context for login/register), but **does** process `/me` — that's what makes the auth-persistence flow work.

### 5.4 `SecurityConfig` (`auth/config/`)

```
permitAll  : /api/v1/auth/**, /actuator/health
ADMIN role : /api/v1/admin/**
authed     : everything else
session    : stateless
csrf       : disabled (HttpOnly + SameSite cookies serve as defence in depth)
password   : BCryptPasswordEncoder(strength = 12)
```

### 5.5 Threat / mitigation summary

| Threat | Mitigation |
|---|---|
| XSS | HttpOnly cookies — JS can't read the JWT |
| CSRF | `SameSite=Lax` + stateless JWT |
| Token theft | 15-min access token; short window of exploit |
| Session hijack | DB-backed refresh tokens with explicit revocation on logout |
| Brute force | BCrypt strength 12 |
| Privilege escalation | `ROLE_ADMIN` only via DB UPDATE; admin endpoints gated in `SecurityConfig` |

---

## 6. API-Football integration & sync

### 6.1 The budget

**API-Football free tier = 100 calls / 24h rolling window.** This is the single hardest constraint on the whole architecture.

Every architectural decision below exists because of it:

- **Sync per Competition, not per League.** Many leagues share one competition → one ingestion stream feeds all of them.
- **Active competitions only** — `is_active = TRUE` AND has ≥ 1 non-archived league. Zero leagues on a competition → zero calls.
- **Tiered cadence** — 15-min polling only during live-match windows. Hourly or slower otherwise.
- **Hard stop at 100.** Budget exhausted → next call is **skipped** (not retried, not queued).
- **Bootstrap on creation** — when a user creates a league for a stale/empty competition, fire a one-shot async bootstrap so they can predict right away.

Steady-state ceiling: ~6–7 active competitions fit comfortably in 100/day.

### 6.2 The budget gate (`sync/budget/ApiCallBudget.java`)

```
reserve(endpoint, compId) ─► SELECT COUNT(*) FROM api_call_log WHERE called_at > now() - 24h
                            return spent < daily-call-limit   (default 100)
record(endpoint, compId, status, note) ─► INSERT api_call_log row
```

Every outbound call flows through `sync/client/ApiFootballClient.java`. The client:
1. Calls `reserve()` — false → returns `Optional.empty()`, no HTTP call.
2. Executes the HTTP call.
3. Calls `record()` in a `finally` (so 4xx/5xx still cost budget — by design, since API-Football counts them too).

Limit configurable via `api.football.daily-call-limit` (default 100). Paid-tier bump = one env change.

### 6.3 Scheduled sync tasks (`sync/orchestrator/`)

All four iterate `competitionRepository.findActiveWithLeagues()` and gate on `sync.scheduler.enabled` (default true).

| Task | Trigger | Endpoint | Calls/day per comp |
|---|---|---|---|
| `LiveWindowTask` | `@Scheduled` fixedDelay = 15 min | `/fixtures?league&season&date=today` only when `hasActiveMatchWindow()` returns true | 6–10 (only during live windows) |
| `UpcomingFixturesTask` | fixedDelay = 6 h | `/fixtures?league&season&next=20` | 4 |
| `MetadataTask` | cron daily 03:00 UTC | `/teams?league&season` | 1 |
| `SquadsTask` | cron Sunday 02:00 UTC | `/players/squads?team` for every team in the competition | ~3/day amortized |
| `CompetitionSyncScheduler` (`competition/`) | cron monthly 1st @ 00:00 | `/leagues?id=<whitelisted>` | rare, big batch |

`hasActiveMatchWindow(comp)` is a DB query — does the comp have any fixture with `status ∉ {final, cancelled}` AND `kickoff_at ∈ [now - 4h, now + 15m]`? If yes, that competition gets a `LiveWindowTask` call this tick.

### 6.4 Bootstrap on league creation

```
LeagueServiceImpl.createLeague (@Transactional)
  └─ eventPublisher.publishEvent(new LeagueCreatedEvent(leagueId, competitionId))
       │ (after the transaction commits)
       ▼
BootstrapSyncListener  (@Async + @TransactionalEventListener(AFTER_COMMIT))
  ├─ needsBootstrap = (no fixtures for comp) OR (last sync older than 6h)
  └─ if needsBootstrap: SyncOrchestrator.bootstrapCompetition(competition)
        ├─ teamSyncService.syncTeams                        (1 call)
        ├─ playerSyncService.syncSquadsForCompetition       (N calls, budget-aware)
        └─ fixtureSyncService.syncUpcoming                  (1 call)
```

- User gets `201 Created` immediately — bootstrap runs off-thread on the `taskExecutor` bean (see `config/AsyncConfig.java`).
- Bootstrap is **idempotent**: if data already exists and was synced in the last 6h, it's a no-op.
- Budget-exhausted calls are silently skipped — the scheduled tasks pick up next tick.

### 6.5 Settlement → scoring engine hook

When `FixtureSyncServiceImpl.syncLiveAndRecent` transitions a fixture from non-final to a final status (`FT` / `AET` / `PEN`):

1. Fetch `/fixtures/events` for that fixture (1 call each).
2. Upsert goals/assists into `fixture_events`.
3. Publish `FixtureSettledEvent(fixtureId)`.

The listener (`prediction/event/FixtureSettledListener.java`) consumes it async + after-commit — see §11.

### 6.6 Whitelist

`application.yml` → `api.football.whitelisted-ids` is a comma-separated list of API-Football league IDs. Only those get pulled by the monthly catalog sync into `external_data.competitions`. Defaults today:

```
1, 2, 3, 39, 61, 78, 135, 140, 94, 88
```

(World Cup, Euros, Premier League, Serie A, Ligue 1, Bundesliga, La Liga, … plus assorted.)

### 6.7 Failure modes

| Failure | Behaviour |
|---|---|
| Budget exhausted | WARN log, skip this tick, no retry. Next scheduled tick tries again. |
| API 5xx | One retry in `ApiFootballClient` with 1s backoff, then give up. `api_call_log` records the status. |
| API 429 | Treated as "budget effectively exhausted." |
| DB unreachable | Standard JPA error propagation; scheduled task fails, retries next tick. |

---

## 7. Domain model — teams, players, fixtures, events

The "external_data" model mirrors API-Football's state without coupling to it (we own primary keys = their IDs):

```
external_data.competitions  1───*  external_data.fixtures  1───*  external_data.fixture_events
        │
        └───*  external_data.team_players  (composite PK, season+comp scoped)
                 │
   external_data.teams  ◄┘
   external_data.players ◄┘
```

Fixture status enum (`fixture/entity/FixtureStatus.java`) with helpers:

- `isFinal()` → FT, AET, PEN
- `isCancelled()` → CANC, ABD, AWD, WO, PST
- `apiCode()` → the raw API-Football string

`FixtureStatusConverter` auto-applies for JPA persistence.

---

## 8. Leagues — creation, joining, browsing, archival

### 8.1 Creating a league

```
POST /api/v1/leagues
{
  "name": "Friends World Cup Pool",
  "visibility": "PRIVATE",
  "competitionId": 39,
  "scoringRules": { … }     -- optional; omit to accept defaults
}
```

Service flow (`LeagueServiceImpl.createLeague`):

1. Load `Competition`. Reject 404 if not found, 400 if `is_active=false`.
2. If `visibility == PRIVATE`: generate a unique join code — 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O/1/I/L`), backed by `SecureRandom`. Up to 5 collision retries; then `JoinCodeGenerationException → 500`.
3. Persist `League` with `season_year` snapshotted from the competition.
4. Persist `LeagueMembership` with `role = OWNER`.
5. Insert `LeagueScoringRules` row — from request body if present, else defaults.
6. Publish `LeagueCreatedEvent` → triggers async bootstrap sync (§6.4).
7. Return `LeagueResponse` (with `joinCode` populated because caller is the owner).

The whole 1–5 chain runs in one `@Transactional` block. The event publishes after commit so the listener doesn't see partial state.

### 8.2 Joining a league

Two paths, both idempotent (already a member → 200 with the existing league; new → 201):

**By code (private or public):**

```
POST /api/v1/leagues/join
{ "code": "A7K9X2" }
```

- `findByJoinCodeIgnoreCase` → 404 `LeagueJoinCodeNotFoundException` if absent.
- Existing membership? Return 200 (no-op).
- Insert membership with `role = MEMBER`, return 201.

**By public browse:**

```
POST /api/v1/leagues/{id}/members
```

- Reject 403 `LeagueNotPublicException` if the league is `PRIVATE` (private leagues must use the code).
- Otherwise same flow as above.

### 8.3 Browsing public leagues

```
GET /api/v1/leagues/public?competitionId=&search=&page=&size=
```

- Excludes archived (`leagues.archived = false`).
- Optional `competitionId` filter and case-insensitive `name` substring search.
- Paged, ordered by `created_at DESC`.
- Response is Spring's `Page<LeagueBrowseResponse>`. Each row includes `memberCount` and a `joined: boolean` flag for the caller.

**Known issue (live):** there's a Postgres error `operator does not exist: text ~~ bytea` when `:search` is null. Hibernate's parameter type inference fails for the `IS NULL OR ... LIKE :param` pattern. Fix planned in `PHASE_4_PLAN.md §3` (wrap `:search` in `CAST(:search AS string)` in `LeagueRepository`).

### 8.4 League detail

```
GET /api/v1/leagues/{id}
```

- Private + non-member → 403 `LeagueAccessDeniedException`.
- `joinCode` is only included for the owner. All other members see `null`.

### 8.5 "My leagues"

```
GET /api/v1/leagues/me
```

Returns `List<LeagueSummaryResponse>` for the caller's memberships. Archived leagues are excluded by default. The service has an internal overload to include them (no UI today).

### 8.6 Members list

```
GET /api/v1/leagues/{id}/members
```

Members only. Sorted owner-first, then by `joinedAt`.

### 8.7 Archival (Phase 3)

```
PATCH /api/v1/admin/leagues/{id}    { "archived": true }
```

- Owner OR `ROLE_ADMIN` can archive (`LeagueAccessDeniedException → 403` for everyone else).
- Side effects:
  - Hidden from `GET /api/v1/leagues/me` by default.
  - Excluded from `GET /api/v1/leagues/public`.
  - `CompetitionRepository.findActiveWithLeagues` requires at least one **non-archived** league — a comp backed only by archived leagues stops driving sync traffic.

---

## 9. Match predictions

### 9.1 Predicting one fixture

```
PUT /api/v1/leagues/{leagueId}/fixtures/{fixtureId}/prediction
{
  "winnerTeamId": 33,        -- null + predictedDraw=true → Draw; null + false → no pick
  "predictedDraw": false,
  "homeScore": 2,
  "awayScore": 1,
  "scorers":   [{ "playerId": 110, "count": 2 }],                      -- sum per side ≤ that side's predicted score
  "assisters": [{ "playerId": 276, "count": 1 }]
}
```

Each pick carries a **count** (how many goals/assists that player is predicted for). A user can pick two different players with count=1 each, or one player with count=2 — both are valid ways to predict "2 goals on this side".

Server-side validation (`PredictionServiceImpl.validateRequest`, exceptions all mapped to `400`):

| Rule | Throws |
|---|---|
| Caller must be a league member | `NotALeagueMemberException → 403` |
| Fixture must belong to the league's `(competitionId, seasonYear)` | `FixtureNotInLeagueException → 400` |
| **Lock check** (see §9.2) | `FixtureLockedException → 423` |
| `winnerTeamId ∈ {null, homeId, awayId}` | `PredictionValidationException → 400` |
| `predictedDraw=true` + `winnerTeamId != null` is mutually exclusive | same |
| Both scores set: must agree with winner pick (home > away for home win, equal for draw, etc.) | same |
| Scores in `0..20` | same |
| If any scorer/assister picks present, both `homeScore` and `awayScore` are required | same |
| No duplicate `playerId` within scorers (separately within assisters) | same |
| Each `count >= 1` | same |
| Each player ID is in the home or away current squad for `(competition, season)` | same |
| **Per-side cap**: `sum(pick.count for picks whose player is on side S) ≤ side S's predicted score` | same |

Persistence is one transaction:
1. Upsert the `predictions` row (unique key `(user, league, fixture)`).
2. `DELETE FROM prediction_scorers WHERE prediction_id = ?` then bulk INSERT new rows.
3. Same for `prediction_assisters`.

Idempotent — re-sending the same body is a no-op.

### 9.2 Locking model

> **Each fixture locks 15 minutes before its own kickoff.**

`locksAt = fixture.kickoff_at - 15m` per fixture. Once `now >= locksAt`, a `PUT` against that fixture returns `423 Locked` (`FixtureLockedException`). Other fixtures in the same round stay editable until their own lock times.

This shifted from gameweek-wide 1 h locks to per-fixture 15 min during Phase 4, so early-round fixtures don't block edits to later ones.

### 9.3 Reading gameweeks & fixtures

```
GET /api/v1/leagues/{id}/gameweeks
```

Returns the full list of rounds with their `firstKickoffAt`, `locksAt`, `fixtureCount`, `userPredictionCount`, and `status`:

- `OPEN`: `now < locksAt` AND at least one fixture is `NS`.
- `LOCKED`: `now >= locksAt` AND any fixture unfinished.
- `SETTLED`: all fixtures terminal (final or cancelled).

```
GET /api/v1/leagues/{id}/gameweeks/{round}/fixtures
```

Returns each fixture with home/away team summaries, both **squads** (empty if not yet synced — UI greys out the scorer/assister pickers), and the caller's existing prediction (if any). The `locksAt` and `locked` flags are repeated at the top of the response for convenience.

---

## 10. Season-end (overall) predictions

One row per `(user, league)` in `app.league_overall_predictions`. Three optional picks:

- `winnerTeamId` — who wins the competition
- `topScorerPlayerId` — golden boot
- `topAssisterPlayerId` — top assister

### 10.1 Locking

Locks at **`competition.season_start`** (a date, not a timestamp). The lock is over once the date is reached.

If a user joins a league after `season_start`, the page shows as already-locked. They can still make per-match predictions going forward.

### 10.2 API

```
GET /api/v1/leagues/{id}/overall-prediction
PUT /api/v1/leagues/{id}/overall-prediction        -- 423 once season_start has passed
GET /api/v1/leagues/{id}/teams                     -- teams for the competition+season (dropdown)
GET /api/v1/leagues/{id}/players                   -- players from all current squads (dropdown)
```

The `PUT` validates that:

- `winnerTeamId` is in the competition's team pool (derived from `team_players` + fixture refs).
- `topScorerPlayerId` / `topAssisterPlayerId` are in any team's current squad for `(competition, season)`.
- Null picks are fine — they count as "no pick", never wrong, just zero points for that category.

### 10.3 Settlement

`SeasonSettledEvent(competitionId, seasonYear)` is published from `FixtureSyncServiceImpl.syncLiveAndRecent` when:

- At least one fixture finalized in this sync run, AND
- The remaining unfinished count is 0 for `(competitionId, seasonYear)`.

`SeasonSettledListener` (`@Async + @TransactionalEventListener(AFTER_COMMIT) + @Transactional(REQUIRES_NEW)`):

1. Load all fixtures for `(comp, season)`.
2. Compute the season's **actual winner team** by argmax of win count (null on tie).
3. Compute **top scorer ids** (set — ties → all tied players are correct).
4. Compute **top assister ids** (set — same tie handling).
5. For each non-archived league on `(comp, season)`:
   - Load that league's `LeagueScoringRules`.
   - For each `LeagueOverallPrediction` not already scored:
     - `winnerCorrect = p.winner == actualWinner`
     - `scorerCorrect = p.topScorer ∈ topScorerIds`
     - `assisterCorrect = p.topAssister ∈ topAssisterIds`
     - `categoriesHit = sum(true flags)` (0..3)
     - `base = leagueWinnerPoints*winnerCorrect + leagueTopScorerPoints*scorerCorrect + leagueTopAssisterPoints*assisterCorrect`
     - `multiplier = 3 → leagueBonus3of3`, `2 → leagueBonus2of3`, else `1.0`
     - `total = round(base * multiplier)`
     - INSERT `league_overall_scores` row with `breakdown` JSON.

Standings query (§12) `LEFT JOIN`s these scores, so a user who hit only the season pick still appears in the leaderboard.

---

## 11. Scoring engine & per-league rules

### 11.1 Per-league rules (Phase 3 headline change)

Scoring is **per league**, controlled by the owner. Stored in `app.league_scoring_rules` (one row per league, V9 migration). See §4.8 for the field list.

| Endpoint | Auth | |
|---|---|---|
| `GET /api/v1/leagues/{id}/scoring-rules` | member | Returns rules + `editable: boolean` |
| `PUT /api/v1/leagues/{id}/scoring-rules` | **owner** | 400 if out of range; 423 once not editable |

**Editability gate:** `editable = !predictionRepo.existsByLeagueId(leagueId)`. Once **any user** submits a prediction in that league, the rules are frozen. Throws `ScoringRulesLockedException → 423`. Rationale: changing rules mid-flight is unfair to early predictors.

### 11.2 The engine (`prediction/service/ScoringEngineImpl.java`)

Pure function, table-driven, called per `(prediction, fixture, events, rules)`:

| Category | Hit when | Points awarded |
|---|---|---|
| Winner / draw | predicted matches actual | `match_winner_points` once |
| Exact score | both `homeScore` and `awayScore` match | `match_exact_score_points` once |
| Scorer | **per pick**: actual goals by that player (own goals excluded) **exactly equals** the predicted `count` | `match_scorer_points` per correct pick |
| Assister | **per pick**: actual assists by that player exactly equals the predicted `count` | `match_assister_points` per correct pick |

Scorer/assister scoring is **additive and exact**. Two different players at count=1 both correct → 2 × `match_scorer_points`. Predicting one player at count=2 when they scored 1 goal → 0 points for that pick. A player scoring more goals than predicted is also incorrect (exact-match both ways).

Categories-hit count (0..4) determines the multiplier — for scorers/assisters, "category hit" means **≥ 1 pick was exactly correct**:

```
multiplier = 4 → rules.match_bonus_4x
             3 → rules.match_bonus_3x
             2 → rules.match_bonus_2x
             0 | 1 → 1.0

final_points = round(baseTotal × multiplier)
```

The `breakdown` JSONB preserves per-pick `playerId`, `predicted`, `actual`, `correct`, `points` inside `scorers[]` / `assisters[]`, plus `categoriesHit`, `baseTotal`, `multiplier`, `total`, and `ruleSetVersion` (the rules' `updated_at` as ms-epoch). Lets the UI render "Haaland 2/2 ✓ + Foden 1/1 ✓ = 6 × 1.5 = 9" and supports retroactive rule audits.

### 11.3 The listener

```
FixtureSettledEvent fired (FixtureSyncServiceImpl on FT transition)
  │ (AFTER_COMMIT + @Async)
  ▼
FixtureSettledListener.onFixtureSettled  (@Transactional)
  ├─ idempotency: if fixtures.settled_at != null → skip
  ├─ load all predictions for fixtureId (across all leagues)
  ├─ batch-load scorer/assister picks (one query per table)
  ├─ load rules: leagueIds = distinct(predictions.leagueId); rulesByLeagueId = repo.findAllById
  ├─ for each prediction:
  │     rules = rulesByLeagueId.get(p.leagueId)    (WARN + skip if missing)
  │     result = engine.score(p, scorers, assisters, fixture, events, rules)
  │     INSERT INTO prediction_scores(points, breakdown)
  └─ UPDATE fixtures SET settled_at = now()
```

Cancelled / postponed fixtures (`CANC`, `PST`, `ABD`, `AWD`, `WO`) don't score anyone (0 across the board). If a postponed match is replayed later, API-Football gives it a new fixture id → new prediction window.

---

## 12. Standings

### 12.1 Paginated all-time

```
GET /api/v1/leagues/{id}/standings?page=0&size=50
```

Returns Spring `Page<StandingsRowResponse>`. Default size 50 — clients omitting pagination params still get a usable response.

Service flow (`StandingsServiceImpl.getStandings`):

1. Membership check.
2. `predictionRepo.findStandingsByLeagueId(leagueId)`:
   ```sql
   SELECT p.user_id, SUM(s.points), COUNT(DISTINCT p.fixture_id)
   FROM   app.predictions p JOIN app.prediction_scores s ON s.prediction_id = p.id
   WHERE  p.league_id = ?
   GROUP BY p.user_id;
   ```
3. `overallScoreRepo.findOverallScoresByLeagueId(leagueId)` — merges season-end points into each user's total.
4. `userRepo.findAllById(...)` for username lookups.
5. Sort by points DESC, then userId ASC (deterministic ties). Compute 1/2/2/4-style ranks.

A user with only a correct season pick and zero match predictions still appears in standings.

### 12.2 Per-gameweek breakdown

```
GET /api/v1/leagues/{id}/standings/gameweeks/{round}
```

Returns a flat list of `(userId, username, predictionsCount, gameweekPoints)` for the round. One JPQL query:

```jpql
SELECT p.userId, COALESCE(SUM(s.points), 0), COUNT(DISTINCT p.fixtureId)
FROM   Prediction p LEFT JOIN PredictionScore s ON s.predictionId = p.id
WHERE  p.leagueId = :leagueId
  AND  p.fixtureId IN (
       SELECT f.id FROM Fixture f
       WHERE f.competitionId = :compId AND f.seasonYear = :season AND f.round = :round)
GROUP BY p.userId
```

Users who didn't predict in the round simply don't appear in the list.

---

## 13. Admin surface

Mounted at `/admin/*` on the frontend, `/api/v1/admin/**` on the backend. ROLE_ADMIN gated in both `SecurityConfig` and the frontend `AdminLayout`. The first ADMIN user is created manually via `UPDATE app.users SET role = 'ADMIN' WHERE email = ?`.

### 13.1 Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/competitions` | List all competitions + counts (`leagueCount`, `activeLeagueCount`, `fixtureCount`) |
| PATCH | `/api/v1/admin/competitions/{id}` | Body `{ "active": Boolean? }` — toggle `is_active` |
| GET | `/api/v1/admin/leagues?search=&archived=&page=&size=` | Paginated league search |
| PATCH | `/api/v1/admin/leagues/{id}` | Body `{ "archived": Boolean? }` — toggle `archived` |
| GET | `/api/v1/admin/budget/log?limit=` | Recent API call log rows |
| GET | `/api/v1/admin/sync/status` | Sync orchestrator state (last-run timestamps per task) |
| POST | `/api/v1/admin/sync/competitions/{id}/bootstrap` | Force-resync a competition (marked `note: admin-manual` in `api_call_log`) |

### 13.2 Pages (frontend `pages/admin/`)

- **`/admin/competitions`** — table with per-row `is_active` toggle and a "Resync now" button (confirmation modal warns about API budget cost).
- **`/admin/budget`** — gauge for `used / 100` last 24h (green < 60, amber < 80, red ≥ 80), hand-rolled horizontal bars grouping last-100 log rows by endpoint, full log table with color-coded status codes.
- **`/admin/leagues`** — paginated search (debounced) + active/archived/all filter + archive toggle.

---

## 14. HTTP API summary

All endpoints are `/api/v1/...`. Errors use RFC 7807 `ProblemDetail` (`application/problem+json`).

### 14.1 Auth (`auth/controller/AuthController.java`)

| Method | Path | Auth | |
|---|---|---|---|
| POST | `/auth/register` | none | Create user; issue cookies |
| POST | `/auth/login` | none | Authenticate; rotate refresh tokens |
| POST | `/auth/logout` | yes | Revoke + clear |
| POST | `/auth/refresh` | refresh cookie | New access cookie + `AuthResponse` |
| GET | `/auth/me` | access cookie | Current user; 401 otherwise |

### 14.2 Competitions

| Method | Path | Auth | |
|---|---|---|---|
| GET | `/competitions` | any user | Active competitions for the wizard |

### 14.3 Leagues (`league/controller/LeagueController.java`)

| Method | Path | Auth | |
|---|---|---|---|
| POST | `/leagues` | user | Create league |
| GET | `/leagues/me` | user | My leagues |
| GET | `/leagues/public` | user | Browse public, paged |
| POST | `/leagues/join` | user | Join by code |
| POST | `/leagues/{id}/members` | user | Join public (403 if private) |
| GET | `/leagues/{id}/members` | member | Member list |
| GET | `/leagues/{id}` | member or any-if-public | League detail |

### 14.4 Predictions (`prediction/controller/`)

| Method | Path | Auth | |
|---|---|---|---|
| GET | `/leagues/{id}/gameweeks` | member | Gameweek list with lock state |
| GET | `/leagues/{id}/gameweeks/{round}/fixtures` | member | Fixtures + squads + my prediction |
| PUT | `/leagues/{id}/fixtures/{fixtureId}/prediction` | member | Upsert; 423 when locked |
| GET | `/leagues/{id}/standings?page=&size=` | member | Paged all-time |
| GET | `/leagues/{id}/standings/gameweeks/{round}` | member | Per-round breakdown |

### 14.5 Scoring rules (`scoring/rules/controller/`)

| Method | Path | Auth | |
|---|---|---|---|
| GET | `/leagues/{id}/scoring-rules` | member | Rules + `editable` |
| PUT | `/leagues/{id}/scoring-rules` | owner | Update; 423 if not editable |

### 14.6 Season-end predictions (`overall/controller/`)

| Method | Path | Auth | |
|---|---|---|---|
| GET | `/leagues/{id}/overall-prediction` | member | My picks + `locksAt` |
| PUT | `/leagues/{id}/overall-prediction` | member | Upsert; 423 after `season_start` |
| GET | `/leagues/{id}/teams` | member | Team dropdown data |
| GET | `/leagues/{id}/players` | member | Player dropdown data |

### 14.7 Admin (`admin/controller/`, `sync/controller/`)

| Method | Path | Auth | |
|---|---|---|---|
| GET | `/admin/competitions` | ADMIN | List + counts |
| PATCH | `/admin/competitions/{id}` | ADMIN | Toggle `active` |
| GET | `/admin/leagues` | ADMIN | Paged search |
| PATCH | `/admin/leagues/{id}` | ADMIN | Toggle `archived` |
| GET | `/admin/budget/log` | ADMIN | Recent log rows |
| GET | `/admin/sync/status` | ADMIN | Task state |
| POST | `/admin/sync/competitions/{id}/bootstrap` | ADMIN | Force resync |

### 14.8 Error → HTTP status

`exception/GlobalExceptionHandler.java`:

| Exception | HTTP | When |
|---|---|---|
| `MethodArgumentNotValidException` | 400 | `@Valid` fail |
| `PredictionValidationException` | 400 | Inconsistent winner/score, unknown player, > 3 picks, duplicates |
| `FixtureNotInLeagueException` | 400 | Fixture not in league's `(comp, season)` |
| `CompetitionInactiveException` | 400 | Trying to create league on `is_active=false` comp |
| `AuthException`, `BadCredentialsException` | 401 | Login fail / no/expired cookie |
| `LeagueAccessDeniedException` | 403 | Non-member private league, archive by non-owner, etc. |
| `NotALeagueMemberException` | 403 | Prediction endpoint by non-member |
| `LeagueNotPublicException` | 403 | `/leagues/{id}/members` on a private league |
| `OnlyOwnerCanEditScoringRulesException` | 403 | Non-owner PUT scoring-rules |
| `CompetitionNotFoundException` | 404 | Unknown competition id |
| `LeagueNotFoundException` | 404 | Unknown league id |
| `LeagueJoinCodeNotFoundException` | 404 | Unknown join code |
| `FixtureNotFoundException` | 404 | Unknown fixture id |
| `FixtureLockedException` | **423** | PUT after fixture lock (15 min before kickoff) |
| `ScoringRulesLockedException` | **423** | PUT rules after first prediction |
| `OverallPredictionLockedException` | **423** | PUT season pick after `season_start` |
| `JoinCodeGenerationException` | 500 | 5 collisions in a row (effectively impossible) |
| `ApiBudgetExhaustedException` | (internal only — never sent to client) | Budget guard |

---

## 15. Known gaps & planned work

### 15.1 Shipped since the Phase 4 plan was written

- **Per-fixture lock, 15 min** — `FixtureLockedException` returns 423 once `kickoff - 15m` passes. Replaced the per-gameweek 1 h lock.
- **Score-driven scorer/assister caps** — no global cap; sum of per-side counts ≤ that side's predicted score. A request with any scorer/assister picks must include both scores.
- **Pick counts (V12)** — `prediction_scorers.count` / `prediction_assisters.count`. See §4.7, §9.1, §11.2.

### 15.2 Still unshipped

- **Browse-leagues 500** — the `operator does not exist: text ~~ bytea` error when `:search` is null in `LeagueRepository.findPublicLeagues` / `findAdminLeagues`. Fix: `CAST(:search AS string)` on the parameter.

### 15.3 Notifications (Phase 3 PR 23 — documented but **not implemented**)

`PHASE_3_IMPLEMENTATION.md` describes an email subsystem (Resend mailer, `NotificationDispatcher`, lock-reminders + results digest, user prefs page). **None of this exists in the code today** — no `notifications/` package, no `V12` migration, no `NotificationPrefsPage`. Treat the section in that doc as a plan, not as shipped.

### 15.4 Other deferrals

- **Tests** — none added in Phase 2 or Phase 3. Existing patterns are mocked-repo unit tests + `@WebMvcTest` slices (see `competition/CompetitionServiceImplTest`, `league/LeagueServiceImplTest`, etc. for Phase 1's templates).
- **Mid-session 401 interceptor** — only the initial session-resume falls back to `/refresh`. A mid-screen access-token expiry still requires a page reload.
- **Rank-delta in standings history** — no standings-history table; delta widgets in the digest template (when notifications ship) would have to pass `0, 0`.
- **`PHASE_3_UI_AUDIT.md`** — 94 frontend findings (1 critical, 13 high). Most notable: modal a11y (no focus trap), join-by-code auto-joins without confirmation, duplicate competitions fetch in the wizard.
- **Admin "promote to ADMIN" UI** — still a manual SQL UPDATE.

---

## 16. Configuration reference

`backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url:        ${SUPABASE_URL}              # jdbc:postgresql://...?sslmode=require
    username:   ${SUPABASE_USER}
    password:   ${SUPABASE_PASSWORD}
  jpa:
    hibernate.ddl-auto: validate
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

api.football:
  base-url:           ${FOOTBALL_API_URL}    # https://v3.football.api-sports.io
  api-key:            ${FOOTBALL_API_KEY}
  whitelisted-ids:    1,2,3,39,61,78,135,140,94,88
  daily-call-limit:   100                    # hard ceiling, paid-tier bumps this

sync.scheduler.enabled: true                 # flip false in tests

scoring:                                     # defaults source for V9 backfill ONLY
  winner-points:           1
  exact-score-points:      2
  scorer-points:           3
  assister-points:         3

competition.sync.cron: '0 0 0 1 * *'         # monthly catalog sync

jwt:
  secret-key:                    ${JWT_SECRET_KEY}    # base64 HS256 key
  access-token.expiration:       900000               # 15 minutes
  refresh-token.expiration:      604800000            # 7 days

cookie:
  domain:    ${COOKIE_DOMAIN:localhost}
  secure:    ${COOKIE_SECURE:false}                   # true in prod
  same-site: ${COOKIE_SAME_SITE:Lax}

notifications:                                       # plumbing exists in config; consumers don't
  provider:     ${NOTIFICATIONS_PROVIDER:resend}
  from-address: ${NOTIFICATIONS_FROM:no-reply@localhost}
  enabled:      ${NOTIFICATIONS_ENABLED:false}
  resend.api-key: ${RESEND_API_KEY:}

app.base-url: ${APP_BASE_URL:http://localhost:5173}  # for deep links
```

`.env` (project root, gitignored) supplies the runtime values. All env vars listed in the file above are required; the rest have sensible defaults.

---

## 17. Running locally

### 17.1 Docker Compose (recommended)

```bash
docker-compose build
docker-compose up -d
docker-compose logs -f
```

Endpoints:

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8080>
- Health: <http://localhost:8080/actuator/health>

### 17.2 Hot-reload dev

```bash
# Backend
cd backend
./mvnw spring-boot:run

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # Vite dev server on http://localhost:5173, proxies /api/* → :8080
```

Flyway applies V1–V11 on backend startup. Until at least one competition exists in `external_data.competitions`, the league-creation wizard shows an empty competition picker — either wait for the monthly cron or call the seed manually (`competition/service/CompetitionSyncServiceImpl.syncCompetitions()`).

### 17.3 Tests

```bash
cd backend
./mvnw test
```

Runs the existing Phase 1 mocked-repo tests (`CompetitionServiceImplTest`, `LeagueServiceImplTest`, `JoinCodeGeneratorImplTest`, `LeagueControllerTest`, `CompetitionSyncServiceImplTest`).

---

## 18. Glossary

| Term | Meaning |
|---|---|
| **Competition** | A real-world football competition synced from API-Football. Lives in `external_data.competitions`. Pre-seeded by an admin whitelist. |
| **League** | A user-created prediction contest on top of one Competition. Lives in `app.leagues`. Public (browseable) or Private (join-code-only). |
| **Gameweek** | The round string from API-Football (e.g. `"Regular Season - 12"`). Used as the partition key for predictions UI. |
| **Locked** | Predictions can no longer be edited. Per-fixture, 15 min before kickoff. |
| **Settled** | All fixtures in a round are final/cancelled AND the scoring engine has consumed them. |
| **Season-end / overall prediction** | The one-per-`(user, league)` season-long pick: winner team, top scorer, top assister. Locks at `competition.season_start`. |
| **Budget** | The 100-calls-per-24h rolling window for API-Football. Tracked via row count in `external_data.api_call_log`. |
| **Bootstrap** | The one-shot async sync that fires after a league is created on a stale/empty competition. |
| **Category correct** | One of four (or three, for season picks): winner, exact score, ≥1 correct scorer pick, ≥1 correct assister pick. A scorer/assister pick is "correct" iff the player's actual count exactly equals the predicted count. Determines the bonus multiplier. |
| **Rule-set version** | The `updated_at` of `league_scoring_rules` as ms-epoch. Persisted into each `prediction_scores.breakdown` for retroactive audit. |
| **`OFFSET DATETIME`** | All persisted timestamps for kickoffs are `TIMESTAMP WITH TIME ZONE` in UTC. Frontend renders in user-local via `Intl.DateTimeFormat`. |
