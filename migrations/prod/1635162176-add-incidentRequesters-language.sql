-- Migration: add-incidentRequesters-language
-- Created at: 2021-10-25 13:42:56

-- ====  UP  ====
BEGIN;
ALTER TABLE `incidentRequesters`
ADD COLUMN `language` VARCHAR(255) DEFAULT NULL;
COMMIT;

-- ==== DOWN ====
BEGIN;
ALTER TABLE `incidentRequesters` DROP COLUMN `language`;
COMMIT;
