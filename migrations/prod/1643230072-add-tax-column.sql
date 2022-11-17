-- Migration: add-tax-column
-- Created at: 2022-01-26 23:47:52

-- ====  UP  ====
BEGIN;
    ALTER TABLE `incidents` ADD COLUMN `taxValue` DECIMAL(10,3) DEFAULT NULL COMMENT 'Tax of refund value' AFTER `merchandiseValue`;
    ALTER TABLE `incidents` MODIFY `relatedShipperId` int(11) AFTER `entityType`;
    ALTER TABLE `incidents` MODIFY `reshipParcelId` int(11) AFTER `entityType`;
COMMIT;
-- ==== DOWN ====
ALTER TABLE
    `incidents` DROP COLUMN `taxValue`;
