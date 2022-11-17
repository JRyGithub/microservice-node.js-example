-- Migration: add-too-late-reason
-- Created at: 2022-01-07 14:24:59
-- ====  UP  ====
BEGIN;
    INSERT INTO
        `incidentCreationDenyReasons`(`name`)
    VALUES
        ('TooLate');
COMMIT;
-- ==== DOWN ====
BEGIN;
    DELETE FROM
        `incidentCreationDenyReasons`
    WHERE 
        `name` = 'TooLate';
COMMIT;
