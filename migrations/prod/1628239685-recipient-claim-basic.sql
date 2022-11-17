-- Migration: recipient-claim-basic
-- Created at: 2021-08-06 11:48:05


-- ====  UP  ====

BEGIN;

    CREATE TABLE `incidentResolutionTypes` (
    `name` varchar(255) NOT NULL,
    PRIMARY KEY (`name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

    INSERT INTO
        `incidentResolutionTypes`(`name`)
    VALUES
        ('REFUND'),
        ('RESHIP');

    CREATE TABLE `userTypes` (
    `name` varchar(255) NOT NULL,
    PRIMARY KEY (`name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

    INSERT INTO
        `userTypes`(`name`)
    VALUES
        ('SHIPPER'),
        ('RECIPIENT'),
        ('CUBYN_AGENT');

    ALTER TABLE `incidents`
        ADD COLUMN `refundedAt` DATETIME DEFAULT NULL COMMENT 'this is date time when refund is processed' AFTER `rejectedReason`,
        ADD COLUMN `resolutionTypeApplied` VARCHAR(255) DEFAULT NULL COMMENT 'resolutionType applied by user link to incidentResolutionTypes' AFTER `refundStatus`,
        ADD COLUMN `resolutionTypeSelected` VARCHAR(255) DEFAULT NULL COMMENT 'reolutionType selected on claim link to incidentResolutionTypes' AFTER `refundStatus`,
        ADD COLUMN `source` VARCHAR(255) DEFAULT NULL COMMENT 'link to userTypes' AFTER `ownerId`,
        ADD CONSTRAINT `fk_incidents_resolutionTypeSelected` FOREIGN KEY(`resolutionTypeSelected`) REFERENCES `incidentResolutionTypes`(`name`),
        ADD CONSTRAINT `fk_incidents_resolutionTypeApplied` FOREIGN KEY(`resolutionTypeApplied`) REFERENCES `incidentResolutionTypes`(`name`),
        ADD CONSTRAINT `fk_incidents_source` FOREIGN KEY(`source`) REFERENCES `userTypes`(`name`);

COMMIT;
-- ==== DOWN ====
BEGIN;

    ALTER TABLE `incidents`
        DROP FOREIGN KEY `fk_incidents_source`,
        DROP FOREIGN KEY `fk_incidents_resolutionTypeApplied`,
        DROP FOREIGN KEY `fk_incidents_resolutionTypeSelected`,
        DROP COLUMN `source`,
        DROP COLUMN `resolutionTypeApplied`,
        DROP COLUMN `resolutionTypeSelected`,
        DROP COLUMN `refundedAt`;

    DROP TABLE `incidentResolutionTypes`;

    DROP TABLE `userTypes`;

COMMIT;
