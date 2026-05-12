-- League-wide predictions: one (user, league) row with three picks — competition winner,
-- top goalscorer, top assister. Scored at season end.

CREATE TABLE IF NOT EXISTS app.league_overall_predictions (
    id                     UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID      NOT NULL REFERENCES app.users(id)              ON DELETE CASCADE,
    league_id              UUID      NOT NULL REFERENCES app.leagues(id)            ON DELETE CASCADE,
    winner_team_id         BIGINT             REFERENCES external_data.teams(id),
    top_scorer_player_id   BIGINT             REFERENCES external_data.players(id),
    top_assister_player_id BIGINT             REFERENCES external_data.players(id),
    created_at             TIMESTAMP DEFAULT NOW(),
    updated_at             TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_overall_predictions_user_league UNIQUE (user_id, league_id)
);

CREATE INDEX idx_overall_predictions_league ON app.league_overall_predictions(league_id);

CREATE TABLE IF NOT EXISTS app.league_overall_scores (
    prediction_id  UUID      PRIMARY KEY REFERENCES app.league_overall_predictions(id) ON DELETE CASCADE,
    points         INT       NOT NULL,
    breakdown      JSONB     NOT NULL,
    settled_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
