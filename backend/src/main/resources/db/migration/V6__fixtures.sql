-- Fixtures (matches) and fixture events (goals, assists).
-- Mirrors API-Football; primary keys reuse API-Football fixture ids.

CREATE TABLE IF NOT EXISTS external_data.fixtures (
    id               BIGINT PRIMARY KEY,
    competition_id   BIGINT NOT NULL REFERENCES external_data.competitions(id) ON DELETE CASCADE,
    season_year      INT NOT NULL,
    round            VARCHAR(100) NOT NULL,
    kickoff_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    status           VARCHAR(20) NOT NULL,
    home_team_id     BIGINT REFERENCES external_data.teams(id),
    away_team_id     BIGINT REFERENCES external_data.teams(id),
    home_score       INT,
    away_score       INT,
    winner_team_id   BIGINT REFERENCES external_data.teams(id),
    last_synced_at   TIMESTAMP,
    settled_at       TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fixtures_comp_season_kickoff ON external_data.fixtures(competition_id, season_year, kickoff_at);
CREATE INDEX idx_fixtures_comp_season_round ON external_data.fixtures(competition_id, season_year, round);
CREATE INDEX idx_fixtures_status ON external_data.fixtures(status);

CREATE TABLE IF NOT EXISTS external_data.fixture_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id   BIGINT NOT NULL REFERENCES external_data.fixtures(id) ON DELETE CASCADE,
    player_id    BIGINT NOT NULL REFERENCES external_data.players(id),
    team_id      BIGINT NOT NULL REFERENCES external_data.teams(id),
    type         VARCHAR(20) NOT NULL,
    minute       INT,
    detail       VARCHAR(50),
    created_at   TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_fixture_events_type CHECK (type IN ('GOAL', 'ASSIST'))
);

CREATE INDEX idx_fixture_events_fixture_type ON external_data.fixture_events(fixture_id, type);
