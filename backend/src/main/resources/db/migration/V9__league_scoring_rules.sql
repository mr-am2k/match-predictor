-- Per-league scoring rules (owner-configurable). Defaults match Phase 2 behaviour so
-- existing leagues see no scoring delta after backfill.

CREATE TABLE IF NOT EXISTS app.league_scoring_rules (
    league_id                  UUID          PRIMARY KEY REFERENCES app.leagues(id) ON DELETE CASCADE,
    match_winner_points        INT           NOT NULL DEFAULT 1,
    match_exact_score_points   INT           NOT NULL DEFAULT 2,
    match_scorer_points        INT           NOT NULL DEFAULT 3,
    match_assister_points      INT           NOT NULL DEFAULT 3,
    league_winner_points       INT           NOT NULL DEFAULT 10,
    league_top_scorer_points   INT           NOT NULL DEFAULT 5,
    league_top_assister_points INT           NOT NULL DEFAULT 5,
    match_bonus_2x             NUMERIC(4,2)  NOT NULL DEFAULT 1.50,
    match_bonus_3x             NUMERIC(4,2)  NOT NULL DEFAULT 2.00,
    match_bonus_4x             NUMERIC(4,2)  NOT NULL DEFAULT 3.00,
    league_bonus_2of3          NUMERIC(4,2)  NOT NULL DEFAULT 1.50,
    league_bonus_3of3          NUMERIC(4,2)  NOT NULL DEFAULT 3.00,
    created_at                 TIMESTAMP     DEFAULT NOW(),
    updated_at                 TIMESTAMP     DEFAULT NOW(),
    CONSTRAINT chk_points_nonneg CHECK (
        match_winner_points        >= 0 AND match_winner_points        <= 50
    AND match_exact_score_points   >= 0 AND match_exact_score_points   <= 50
    AND match_scorer_points        >= 0 AND match_scorer_points        <= 50
    AND match_assister_points      >= 0 AND match_assister_points      <= 50
    AND league_winner_points       >= 0 AND league_winner_points       <= 100
    AND league_top_scorer_points   >= 0 AND league_top_scorer_points   <= 100
    AND league_top_assister_points >= 0 AND league_top_assister_points <= 100
    ),
    CONSTRAINT chk_multipliers_range CHECK (
        match_bonus_2x    BETWEEN 1.00 AND 10.00
    AND match_bonus_3x    BETWEEN 1.00 AND 10.00
    AND match_bonus_4x    BETWEEN 1.00 AND 10.00
    AND league_bonus_2of3 BETWEEN 1.00 AND 10.00
    AND league_bonus_3of3 BETWEEN 1.00 AND 10.00
    )
);

-- Backfill defaults for every existing league so /scoring-rules never 404s.
INSERT INTO app.league_scoring_rules (league_id)
    SELECT id FROM app.leagues
    ON CONFLICT (league_id) DO NOTHING;
