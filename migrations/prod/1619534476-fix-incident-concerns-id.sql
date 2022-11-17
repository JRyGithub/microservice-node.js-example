-- Migration: fix-incident-concerns-id
-- Created at: 2021-04-27 16:41:30

-- ====  UP  ====

ALTER TABLE
    `incidentConcerns`
CHANGE `id` `id` VARCHAR(255) NOT NULL COMMENT 'used to deduplicate concerns, it might concatenate many operands';

-- ==== DOWN ====

ALTER TABLE
    `incidentConcerns`
CHANGE `id` `id` VARCHAR(36) NOT NULL COMMENT 'used to deduplicate concerns, it might concatenate many operands';
