CREATE SCHEMA IF NOT EXISTS external_data;

CREATE TABLE IF NOT EXISTS external_data.competitions (
    id               BIGINT PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    type             VARCHAR(50),
    logo_url         VARCHAR(500),
    country_name     VARCHAR(100),
    country_flag_url VARCHAR(500),
    season_year      INT NOT NULL,
    season_start     DATE,
    season_end       DATE,
    last_synced_at   TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);
