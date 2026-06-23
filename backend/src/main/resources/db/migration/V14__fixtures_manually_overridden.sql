-- Admin manual result correction.
-- When an admin edits a fixture's score / scorers / assisters, the fixture is
-- flagged so the API-Football sync no longer overwrites it with (potentially
-- wrong) upstream data.

ALTER TABLE external_data.fixtures
    ADD COLUMN manually_overridden BOOLEAN NOT NULL DEFAULT FALSE;
