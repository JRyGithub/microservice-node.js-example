-- Migration: add-incident-indices
-- Created at: 2021-04-15 16:33:47
-- ====  UP  ====
ALTER TABLE
    incidents
ADD
    INDEX `idx_incidents_byShipper` (`ownerId`, `type`, `status`, `refundStatus`),
ADD
    INDEX `idx_incidents_byStatuses` (`type`, `status`, `refundStatus`);

-- ==== DOWN ====
ALTER TABLE
    incidents DROP INDEX `idx_incidents_byShipper`,
    DROP INDEX `idx_incidents_byStatuses`;
