-- Migration: add-refund-generated-id

-- Created at: 2021-10-04 13:39:35

-- ====  UP  ====

ALTER TABLE `incidents`
    ADD COLUMN `refundSentXMLEndToEndId` VARCHAR(255) DEFAULT NULL COMMENT 'corresponding xml EndToEndId, that was generated' AFTER `refundSentToHeadOfFinanceAt`;

-- ==== DOWN ====

ALTER TABLE `incidents`
    DROP COLUMN `refundSentXMLEndToEndId`;
