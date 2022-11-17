-- Migration: rename-refundedAt-to-decidedToRefundAt
-- Created at: 2021-08-11 13:22:47

-- ====  UP  ====

ALTER TABLE incidents CHANGE `refundedAt` `decidedToRefundAt` DATETIME;

-- ==== DOWN ====

ALTER TABLE incidents CHANGE `decidedToRefundAt` `refundedAt` DATETIME;
