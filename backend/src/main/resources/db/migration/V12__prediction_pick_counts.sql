ALTER TABLE app.prediction_scorers
    ADD COLUMN count INT NOT NULL DEFAULT 1
    CHECK (count >= 1);

ALTER TABLE app.prediction_assisters
    ADD COLUMN count INT NOT NULL DEFAULT 1
    CHECK (count >= 1);
