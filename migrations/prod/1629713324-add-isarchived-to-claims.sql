-- Migration: add-isarchived-to-claims
-- Created at: 2021-08-23 12:08:44
-- ====  UP  ====
ALTER TABLE `incidents` ADD COLUMN `isArchived` boolean NOT NULL DEFAULT false;
-- ==== DOWN ====
ALTER TABLE
    `incidents` DROP COLUMN `isArchived`;