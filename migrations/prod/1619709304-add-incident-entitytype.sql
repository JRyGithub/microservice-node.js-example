-- Migration: add-incident-entitytype
-- Created at: 2021-04-28 14:09:49
-- ====  UP  ====

INSERT INTO
    `incidentEntityTypes`(`name`)
VALUES
    ('PARCEL');

ALTER TABLE `incidents`
    MODIFY COLUMN `refundStatus` VARCHAR(255) DEFAULT 'CREATED'
        AFTER `status`;

-- ==== DOWN ====

DELETE FROM `incidentEntityTypes`
    WHERE `name` = 'PARCEL';

ALTER TABLE `incidents`
    MODIFY COLUMN `refundStatus` VARCHAR(255) DEFAULT 'CREATED'
        AFTER `type`;
