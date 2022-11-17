-- Migration: add-incident-is-manually-updated
-- Created at: 2021-04-20 16:32:58

-- ====  UP  ====

ALTER TABLE
    `incidents`
ADD
    COLUMN `isManuallyUpdated` TINYINT(1) NOT NULL DEFAULT 0
AFTER
    `status`;

-- ==== DOWN ====

ALTER TABLE
    `incidents`
DROP
    COLUMN `isManuallyUpdated`;
