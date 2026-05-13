-- League archival flag. Archived leagues are hidden from "my leagues" by default and
-- no longer drive the per-competition sync pipeline.

ALTER TABLE app.leagues
    ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_leagues_archived ON app.leagues(archived);
