-- Migration: add-related-shippeid
-- Created at: 2021-09-23 15:34:27
-- ====  UP  ====
ALTER TABLE `incidents`
    ADD COLUMN `relatedShipperId` INTEGER;

-- ==== DOWN ====
ALTER TABLE `incidents`
    DROP COLUMN `relatedShipperId`;
