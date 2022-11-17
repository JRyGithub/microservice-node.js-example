-- Migration: incident-manual-refund-fields
-- Created at: 2021-04-28 14:09:49
-- ====  UP  ====
ALTER TABLE `incidents`
    -- refund status becomes nullable
    CHANGE `refundStatus` `refundStatus` varchar(255) NULL DEFAULT 'CREATED',
    ADD COLUMN `rejectedReason` VARCHAR(255) DEFAULT NULL AFTER `isManuallyUpdated`,
    ADD COLUMN `merchandiseValue` decimal(10, 3) DEFAULT NULL COMMENT 'only used for manual flow incidents' AFTER `isManuallyUpdated`,
    ADD COLUMN `shippingFeesAmount` INT(3) DEFAULT NULL COMMENT 'only used for manual flow incidents, percentage value' AFTER `isManuallyUpdated`;

-- ==== DOWN ====

ALTER TABLE `incidents`
    CHANGE `refundStatus` `refundStatus` varchar(255) NOT NULL DEFAULT 'CREATED',
    DROP COLUMN `rejectedReason`,
    DROP COLUMN `merchandiseValue`,
    DROP COLUMN `shippingFeesAmount`;
