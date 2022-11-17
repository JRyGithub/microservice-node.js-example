-- Migration: add-incident-concerns
-- Created at: 2021-04-12 16:07:41
-- ====  UP  ====
ALTER TABLE
    attachments RENAME TO incidentAttachments;

CREATE TABLE `incidentConcernTypes` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO
    `incidentConcernTypes`(`name`)
VALUES
    ('MERCHANDISE');

CREATE TABLE `incidentConcerns` (
    `id` CHAR(36) NOT NULL,
    `incidentId` CHAR(36) NOT NULL,
    `entityId` VARCHAR(255) NOT NULL,
    `entityType` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_incidentConcerns_incidentId` FOREIGN KEY(`incidentId`) REFERENCES `incidents`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `fk_incidentConcerns_type` FOREIGN KEY(`type`) REFERENCES `incidentConcernTypes`(`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

-- ==== DOWN ====
DROP TABLE `incidentConcerns`;

DROP TABLE `incidentConcernTypes`;

ALTER TABLE
    incidentAttachments RENAME TO attachments;
