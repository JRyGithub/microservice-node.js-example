-- Migration: add-refund-generated

-- Created at: 2021-09-17 01:26:59

-- ====  UP  ====

ALTER TABLE `incidents`
    ADD COLUMN `refundSentToHeadOfFinanceAt` DATETIME DEFAULT NULL COMMENT 'date when refund has been sent to head of finance' AFTER `decidedToRefundAt`;

-- ==== DOWN ====
ALTER TABLE `incidents`
    DROP COLUMN `refundSentToHeadOfFinanceAt`;
