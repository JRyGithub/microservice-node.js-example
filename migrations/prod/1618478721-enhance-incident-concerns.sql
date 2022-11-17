-- Migration: enhance-incident-concerns
-- Created at: 2021-04-15 11:25:21
-- ====  UP  ====
ALTER TABLE
    `incidentConcerns` CHANGE `id` `id` varchar(36) NOT NULL COMMENT 'used to deduplicate concerns, it might concatenate many operands',
ADD
    COLUMN `amount` decimal(10, 3) NULL COMMENT '',
ADD
    COLUMN `amountType` enum('VALUE', 'PERCENT') NULL COMMENT '',
ADD
    COLUMN `quantity` integer NULL COMMENT '';

-- ==== DOWN ====
ALTER TABLE
    `incidentConcerns` CHANGE `id` `id` char(36) NOT NULL COMMENT '',
    DROP COLUMN `amount`,
    DROP COLUMN `amountType`,
    DROP COLUMN `quantity`;
