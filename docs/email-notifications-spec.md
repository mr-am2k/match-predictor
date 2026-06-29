# Spec: Email match‑reminder notifications (opt‑in)

> Self‑contained implementation spec. Hand this back later ("implement this spec")
> and it can be built directly. Repo: `match-predictor` (Spring Boot backend +
> React/Vite frontend).

## 1. Goal & decisions

Send each user an email ~1 hour before a match reminding them to set predictions.

Confirmed behavior:
- **Separate notification email** — users enter the address to notify (not forced
  to use their account email).
- **Only if not yet predicted** — for a given match, email a user only if they
  belong to a league on that match and have no prediction for it yet.
- **Off by default** — opt‑in; users explicitly enable.
- **Can turn off** — from a settings page and via a one‑click unsubscribe link in
  the email.

## 2. Existing building blocks to reuse

- Scheduling already enabled: `@EnableScheduling` in `backend/.../Application.java`;
  pattern to copy: `backend/.../sync/orchestrator/LiveWindowTask.java`
  (`@Scheduled` + `@ConditionalOnProperty`).
- `backend/.../fixture/entity/Fixture.java` has `kickoffAt` (OffsetDateTime),
  `status` (`FixtureStatus`), `competitionId`, `seasonYear`.
- `backend/.../fixture/repository/FixtureRepository.java` has
  `findAllByCompetitionIdAndKickoffAtBetween(...)` and time‑window helpers.
- `backend/.../league/repository/LeagueMembershipRepository.java`
  (`findByLeagueWithUser`, `findLeagueIdsByUserId`, etc.).
- `backend/.../prediction/repository/PredictionRepository.java`
  (`findByUserIdAndLeagueIdAndFixtureId`).
- `backend/.../auth/entity/User.java` (already has `email`, `username`, `role`).
- `backend/.../config/AsyncConfig.java` (`@Async` executor exists).
- `backend/.../sync/orchestrator/SyncOrchestrator.java` (`activeCompetitions()`).
- Frontend HTTP wrapper with auto refresh‑on‑401/403: `frontend/src/api/http.ts`
  (`apiFetch`) — **use this**, not raw `fetch`.
- Toggle UI to copy: `ActiveSwitch` in
  `frontend/src/pages/admin/AdminCompetitionsPage.tsx`.

## 3. SMTP provider

Recommended: **Brevo** (free ~300/day, plain SMTP relay, no lock‑in):
`smtp-relay.brevo.com:587`, STARTTLS, username = Brevo login, password = SMTP key.
Swappable to SES/Mailgun/SendGrid/Gmail by changing env only. For local testing,
use **MailHog** (`localhost:1025`, no auth). The whole feature is gated by
`notifications.enabled` (default **false**) so the app runs unchanged until creds
are set.

## 4. Backend changes

### 4.1 Dependency + config
- `backend/pom.xml`: add `spring-boot-starter-mail`.
- `backend/src/main/resources/application.yml`:
  ```yaml
  spring:
    mail:
      host: ${MAIL_HOST:smtp-relay.brevo.com}
      port: ${MAIL_PORT:587}
      username: ${MAIL_USERNAME:}
      password: ${MAIL_PASSWORD:}
      properties:
        mail.smtp.auth: true
        mail.smtp.starttls.enable: true
  notifications:
    enabled: ${NOTIFICATIONS_ENABLED:false}
    from-address: ${MAIL_FROM:no-reply@match-predictor.app}
    app-base-url: ${APP_BASE_URL:http://localhost:5173}
    reminder-lead-minutes: ${REMINDER_LEAD_MINUTES:60}
  ```

### 4.2 Migration `V15__user_notifications.sql`
```sql
ALTER TABLE app.users
    ADD COLUMN notification_email     VARCHAR(255),
    ADD COLUMN match_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN unsubscribe_token      UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX idx_users_unsubscribe_token ON app.users(unsubscribe_token);

CREATE TABLE app.match_reminders (
    fixture_id BIGINT      NOT NULL,
    user_id    UUID        NOT NULL,
    sent_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fixture_id, user_id)
);
```

### 4.3 Entities / repositories
- `auth/entity/User.java`: add `notificationEmail` (String), `matchRemindersEnabled`
  (boolean), `unsubscribeToken` (UUID). Keep existing `@Builder.Default` style.
- `auth/repository/UserRepository.java`: add `Optional<User> findByUnsubscribeToken(UUID token)`.
- New `notification/entity/MatchReminder.java` (`@Table(name="match_reminders", schema="app")`,
  `@IdClass(MatchReminderId.class)` over `fixtureId` + `userId`, `sentAt`).
- New `notification/repository/MatchReminderRepository.java`:
  `boolean existsByFixtureIdAndUserId(Long fixtureId, UUID userId)`.

### 4.4 Preferences API — `notification/controller/NotificationController.java` (+ service/impl)
Base `/api/v1/notifications` (authenticated except unsubscribe). Uses
`@AuthenticationPrincipal User`.
- `GET /preferences` → `NotificationPreferencesResponse { String notificationEmail,
  boolean matchRemindersEnabled }`.
- `PUT /preferences` body `UpdateNotificationPreferencesRequest { String
  notificationEmail, boolean matchRemindersEnabled }`:
  - If `matchRemindersEnabled == true`, `notificationEmail` must be non‑blank &
    `@Email` valid → else 400. Persist; return the updated preferences.
- `GET /unsubscribe?token={uuid}` (**public**): find user by `unsubscribeToken`;
  set `matchRemindersEnabled=false`; return a small HTML confirmation (or 302 to
  `{app-base-url}/unsubscribed`). Unknown token → 404/neutral page.
- `config/SecurityConfig.java`: add
  `.requestMatchers("/api/v1/notifications/unsubscribe").permitAll()` **before**
  `anyRequest().authenticated()`.
- Validation exception: reuse `prediction.exception.PredictionValidationException`
  (already 400‑mapped in `GlobalExceptionHandler`) or add a dedicated one + handler.

### 4.5 Email sender — `notification/service/EmailService.java`
- Inject `JavaMailSender` + `notifications.*` props.
- `@Async` send (reuse `AsyncConfig`).
- Method `sendMatchReminder(String toEmail, Fixture fixture, teamNames,
  List<leaguesNeedingPick>, unsubscribeUrl, deepLinkUrl)`.
- HTML body: subject `"⚽ {Home} vs {Away} — set your prediction"`, kickoff time,
  league(s) needing a pick, a deep link
  (`{app-base-url}/leagues/{leagueId}/...gameweek...`), and an unsubscribe link
  (`{app-base-url}/api/v1/notifications/unsubscribe?token={unsubscribeToken}` — or
  the API origin in prod via Caddy `/api/*`).

### 4.6 Reminder scheduler — `notification/MatchReminderTask.java`
- `@Component`, `@ConditionalOnProperty(name="notifications.enabled",
  havingValue="true")`, `@Scheduled(fixedDelayString="PT5M",
  initialDelayString="PT2M")`.
- Per tick:
  1. Compute window `[now, now + reminder-lead-minutes]` (UTC `OffsetDateTime`).
  2. Upcoming fixtures = status in `{NS, TBD}` with `kickoffAt` in window. Either
     add `FixtureRepository.findByStatusInAndKickoffAtBetween(statuses, from, to)`
     or iterate `SyncOrchestrator.activeCompetitions()` ×
     `findAllByCompetitionIdAndKickoffAtBetween`.
  3. Candidate recipients per fixture (new query, e.g. in a notification repo or
     `PredictionRepository`): distinct `(userId, notificationEmail, leagueId)`
     where the user is a member of a **non‑archived** league on the fixture's
     `(competitionId, seasonYear)`, `matchRemindersEnabled=true`,
     `notificationEmail` is not null, and **no** `Prediction` exists for
     `(userId, leagueId, fixtureId)`.
  4. Group by user → one email per `(user, fixture)` listing all leagues needing a
     pick. Skip if `MatchReminderRepository.existsByFixtureIdAndUserId`. Send, then
     insert `match_reminders` row (on send failure, do **not** insert so it retries
     next tick).
- Log counts (fixtures scanned, emails sent, skipped).

## 5. Frontend changes
- `frontend/src/types/notifications.ts`:
  `NotificationPreferences { notificationEmail: string | null; matchRemindersEnabled: boolean }`.
- `frontend/src/api/notifications.ts`: `getNotificationPreferences()`,
  `updateNotificationPreferences(body)` — built on `apiFetch` from `src/api/http.ts`.
- `frontend/src/pages/NotificationSettingsPage.tsx`: email `<input type="email">`
  + on/off toggle (copy `ActiveSwitch`) + Save button; disable save / show hint if
  enabling without a valid email; success + error banners (copy `AlertBanner`).
- `frontend/src/App.tsx`: add `<Route path="/settings/notifications" …>` inside the
  authenticated `ProtectedRoute` group; add a nav link (navbar or `DashboardPage`).
- Optional `/unsubscribed` confirmation route if the backend redirects there.

## 6. File checklist
**Backend (new):** `db/migration/V15__user_notifications.sql`;
`notification/entity/MatchReminder.java`, `MatchReminderId.java`;
`notification/repository/MatchReminderRepository.java`;
`notification/dto/NotificationPreferencesResponse.java`,
`UpdateNotificationPreferencesRequest.java`;
`notification/controller/NotificationController.java`;
`notification/service/NotificationService.java` + `NotificationServiceImpl.java`;
`notification/service/EmailService.java`; `notification/MatchReminderTask.java`.
**Backend (edit):** `pom.xml`, `application.yml`, `auth/entity/User.java`,
`auth/repository/UserRepository.java`, `config/SecurityConfig.java`,
`fixture/repository/FixtureRepository.java` (window query if added).
**Frontend (new):** `types/notifications.ts`, `api/notifications.ts`,
`pages/NotificationSettingsPage.tsx`. **Frontend (edit):** `App.tsx`, navbar/dashboard.

## 7. Acceptance criteria / verification
1. `cd backend && ./mvnw compile` and `cd frontend && npm run build` both pass.
2. Flyway applies `V15`; new columns + `app.match_reminders` exist.
3. `PUT /api/v1/notifications/preferences` saves; `GET` returns it; enabling with
   blank/invalid email → 400.
4. With MailHog + `NOTIFICATIONS_ENABLED=true`: a fixture ~50 min out, an opted‑in
   league member with no prediction → one email arrives within a tick; next tick
   sends nothing (de‑dup).
5. Users who already predicted, or are opted‑out, get nothing.
6. Unsubscribe link flips `match_reminders_enabled=false`; no further emails.
7. With `NOTIFICATIONS_ENABLED=false` (default), the task bean is absent and
   behavior is unchanged.

## 8. Notes / risks
- Times are UTC (`OffsetDateTime`); compute the window in UTC and compare to
  `kickoffAt`. Tick cadence (5 min) means "≈1 hour before", not exact.
- Don't email cancelled/postponed fixtures (status filter handles this; they leave
  `{NS,TBD}`).
- Per‑(user,fixture) de‑dup means a user in multiple leagues for one match gets a
  single email listing all leagues needing a pick.
- Account email is untouched; reminders use `notification_email` only.
