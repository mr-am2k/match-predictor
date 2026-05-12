-- Predictions and scoring results.

CREATE TABLE IF NOT EXISTS app.predictions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    league_id         UUID NOT NULL REFERENCES app.leagues(id) ON DELETE CASCADE,
    fixture_id        BIGINT NOT NULL REFERENCES external_data.fixtures(id) ON DELETE CASCADE,
    winner_team_id    BIGINT REFERENCES external_data.teams(id),
    predicted_draw    BOOLEAN NOT NULL DEFAULT FALSE,
    home_score        INT,
    away_score        INT,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_predictions_user_league_fixture UNIQUE (user_id, league_id, fixture_id)
);

CREATE INDEX idx_predictions_league_fixture ON app.predictions(league_id, fixture_id);
CREATE INDEX idx_predictions_user_league ON app.predictions(user_id, league_id);

CREATE TABLE IF NOT EXISTS app.prediction_scorers (
    prediction_id    UUID NOT NULL REFERENCES app.predictions(id) ON DELETE CASCADE,
    player_id        BIGINT NOT NULL REFERENCES external_data.players(id),
    PRIMARY KEY (prediction_id, player_id)
);

CREATE TABLE IF NOT EXISTS app.prediction_assisters (
    prediction_id    UUID NOT NULL REFERENCES app.predictions(id) ON DELETE CASCADE,
    player_id        BIGINT NOT NULL REFERENCES external_data.players(id),
    PRIMARY KEY (prediction_id, player_id)
);

CREATE TABLE IF NOT EXISTS app.prediction_scores (
    prediction_id    UUID PRIMARY KEY REFERENCES app.predictions(id) ON DELETE CASCADE,
    points           INT NOT NULL,
    breakdown        JSONB NOT NULL,
    settled_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
