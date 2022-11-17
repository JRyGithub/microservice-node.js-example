-- Migration: add-reship-parcelId
-- Created at: 2021-10-01 10:25:32
-- ====  UP  ====
ALTER TABLE `incidents`
    ADD COLUMN `reshipParcelId` VARCHAR(255) DEFAULT NULL COMMENT 'link to `service.parcel`.id';

-- ==== DOWN ====

ALTER TABLE `incidents`
    DROP COLUMN `reshipParcelId`;
