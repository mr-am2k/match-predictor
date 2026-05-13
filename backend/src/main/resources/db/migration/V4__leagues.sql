CREATE TABLE IF NOT EXISTS app.leagues (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) NOT NULL,
    visibility     VARCHAR(20) NOT NULL,
    join_code      VARCHAR(12) UNIQUE,
    competition_id BIGINT NOT NULL REFERENCES external_data.competitions(id),
    season_year    INT NOT NULL,
    owner_id       UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_leagues_visibility CHECK (visibility IN ('PUBLIC', 'PRIVATE'))
);

CREATE INDEX idx_leagues_owner_id ON app.leagues(owner_id);
CREATE INDEX idx_leagues_join_code ON app.leagues(join_code);
CREATE INDEX idx_leagues_visibility_competition ON app.leagues(visibility, competition_id);

CREATE TABLE IF NOT EXISTS app.league_memberships (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES app.leagues(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    role      VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_league_memberships_league_user UNIQUE (league_id, user_id),
    CONSTRAINT chk_league_memberships_role CHECK (role IN ('OWNER', 'MEMBER'))
);

CREATE INDEX idx_league_memberships_league_id ON app.league_memberships(league_id);
CREATE INDEX idx_league_memberships_user_id ON app.league_memberships(user_id);
