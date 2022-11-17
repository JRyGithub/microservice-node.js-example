-- Migration: add-returns
-- Created at: 2022-01-17 21:27:34

-- ====  UP  ====
BEGIN;
    CREATE TABLE `incidentReturns` (
        `id` CHAR(36) NOT NULL,
        `incidentId` CHAR(36) NOT NULL,
        `parcelId` VARCHAR(255) NOT NULL,
        PRIMARY KEY (`id`),
        CONSTRAINT `fk_returns_incidentId` FOREIGN KEY(`incidentId`) REFERENCES `incidents`(`id`) ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8;
COMMIT;

-- ==== DOWN ====
BEGIN;
    DROP TABLE `incidentReturns`;
COMMIT;

