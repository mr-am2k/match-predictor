ALTER TABLE app.league_scoring_rules
    ADD COLUMN IF NOT EXISTS assisters_enabled BOOLEAN NOT NULL DEFAULT TRUE;
