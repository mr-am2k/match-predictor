-- Knockout penalties support.
--
-- 1. Persist the penalty-shootout result on the (shared) fixture, sourced from
--    API-Football's score.penalty.{home,away}. The 120' result itself continues
--    to live in fixtures.home_score / away_score (the sync now stores the
--    post-extra-time `goals` there instead of the 90' fulltime score).
-- 2. Let a player who predicts a draw also pick who advances on penalties.
-- 3. Per-league owner toggle + configurable points + an enable timestamp. The
--    timestamp gates scoring to fixtures whose prediction window was still open
--    when the owner turned penalties on ("only affect upcoming matches").

ALTER TABLE external_data.fixtures
    ADD COLUMN penalty_home_score INT,
    ADD COLUMN penalty_away_score INT;

ALTER TABLE app.predictions
    ADD COLUMN penalty_winner_team_id BIGINT;

ALTER TABLE app.league_scoring_rules
    ADD COLUMN penalties_enabled     BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN penalty_winner_points INT       NOT NULL DEFAULT 5,
    ADD COLUMN penalties_enabled_at  TIMESTAMP;

ALTER TABLE app.league_scoring_rules
    ADD CONSTRAINT chk_penalty_points_range CHECK (penalty_winner_points BETWEEN 0 AND 50);
