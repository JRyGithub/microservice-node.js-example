-- Migration: add-organization-name
-- Created at: 2021-11-16 22:19:21

-- ====  UP  ====
BEGIN;
ALTER TABLE `incidentRequesters`
ADD COLUMN `organizationName` VARCHAR(255) DEFAULT NULL AFTER `lastName`;
COMMIT;
-- ==== DOWN ====
BEGIN;
ALTER TABLE `incidentRequesters` DROP COLUMN `organizationName`;
COMMIT;
