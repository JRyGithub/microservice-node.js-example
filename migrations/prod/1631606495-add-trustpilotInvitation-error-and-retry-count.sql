-- Migration: add-trustpilotInvitation-error-and-retry-count
-- Created at: 2021-09-14 10:01:35
-- ====  UP  ====
BEGIN;

ALTER TABLE `trustpilotInvitations`
ADD COLUMN error JSON;

ALTER TABLE `trustpilotInvitations`
ADD COLUMN retriesCount INT NOT NULL DEFAULT 0;

COMMIT;
-- ==== DOWN ====
BEGIN;

ALTER TABLE `trustpilotInvitations`
DROP COLUMN `error`;

ALTER TABLE `trustpilotInvitations`
DROP COLUMN `retriesCount`;

COMMIT;
