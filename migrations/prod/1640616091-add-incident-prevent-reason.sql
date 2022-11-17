-- Migration: add-incident-prevent-reason
-- Created at: 2021-12-27 17:41:31

-- ====  UP  ====
BEGIN;
    CREATE TABLE `incidentCreationDenyReasons` (
        `name` VARCHAR(255) NOT NULL,
        PRIMARY KEY (`name`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8;

    INSERT INTO
        `incidentCreationDenyReasons`(`name`)
    VALUES
        ('AlreadyDelivered'),
        ('AlreadyResolved'),
        ('BeingResolved'),
        ('DeliveredOnTime'),
        ('NotDelivered'),
        ('CountryNotEligible');

    CREATE TABLE `incidentCreationDenyLog` (
        `id` CHAR(36) NOT NULL,
        `parcelId` VARCHAR(255) NOT NULL,
        `incidentType` VARCHAR(255) NOT NULL,
        `reason` VARCHAR(255) NOT NULL,
        `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT `fk_incidentCreationDenyLog_type` FOREIGN KEY(`incidentType`) REFERENCES `incidentTypes`(`name`),
        CONSTRAINT `fk_incidentCreationDenyLog_reason` FOREIGN KEY(`reason`) REFERENCES `incidentCreationDenyReasons`(`name`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8;
COMMIT;


-- ==== DOWN ====
BEGIN;
    DROP TABLE `incidentCreationDenyLog`;
    DROP TABLE `incidentCreationDenyReasons`;
COMMIT;
