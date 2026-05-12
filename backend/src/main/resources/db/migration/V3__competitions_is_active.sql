ALTER TABLE external_data.competitions
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
