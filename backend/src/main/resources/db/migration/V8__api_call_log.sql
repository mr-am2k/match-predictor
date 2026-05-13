-- API-Football call log for budget tracking and debugging.

CREATE TABLE IF NOT EXISTS external_data.api_call_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    called_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    endpoint         VARCHAR(100) NOT NULL,
    competition_id   BIGINT,
    status_code      INT,
    note             VARCHAR(200)
);

CREATE INDEX idx_api_call_log_called_at ON external_data.api_call_log(called_at DESC);
