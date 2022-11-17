-- Migration: add-still-on-time-reason
-- Created at: 2022-01-04 16:05:35

-- ====  UP  ====
BEGIN;
    INSERT INTO
        `incidentCreationDenyReasons`(`name`)
    VALUES
        ('StillOnTime');
COMMIT;
-- ==== DOWN ====
BEGIN;
    DELETE FROM
        `incidentCreationDenyReasons`
    WHERE 
        `name` = 'StillOnTime';
COMMIT;
