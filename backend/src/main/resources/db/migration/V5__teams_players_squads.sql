-- Teams, players, and squads (season-scoped per competition).
-- Mirrors API-Football data; primary keys reuse API-Football ids.

CREATE TABLE IF NOT EXISTS external_data.teams (
    id               BIGINT PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    code             VARCHAR(10),
    country          VARCHAR(100),
    logo_url         VARCHAR(500),
    last_synced_at   TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_data.players (
    id               BIGINT PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    photo_url        VARCHAR(500),
    position         VARCHAR(50),
    nationality      VARCHAR(100),
    last_synced_at   TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_data.team_players (
    team_id         BIGINT NOT NULL REFERENCES external_data.teams(id) ON DELETE CASCADE,
    player_id       BIGINT NOT NULL REFERENCES external_data.players(id) ON DELETE CASCADE,
    season_year     INT NOT NULL,
    competition_id  BIGINT NOT NULL REFERENCES external_data.competitions(id) ON DELETE CASCADE,
    removed_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (team_id, player_id, season_year, competition_id)
);

CREATE INDEX idx_team_players_comp_season ON external_data.team_players(competition_id, season_year);
CREATE INDEX idx_team_players_player_id ON external_data.team_players(player_id);
