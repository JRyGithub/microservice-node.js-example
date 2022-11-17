-- Migration: add-incidents
-- Created at: 2021-04-01 15:40:44
-- ====  UP  ====
-- Migration: add-incidents-and-refunds
-- Created at: 2021-03-29 19:52:00
-- ====  UP  ====
-- Soft delete (no DELETE CASCADE)
CREATE TABLE `incidentEntityTypes` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO
    `incidentEntityTypes`(`name`)
VALUES
    ('PRODUCT');

CREATE TABLE `incidentTypes` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO
    `incidentTypes`(`name`)
VALUES
    ('SKU_DAMAGED_IN_WAREHOUSE');

CREATE TABLE `incidents` (
    `id` CHAR(36) NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `origin` VARCHAR(255) NOT NULL COMMENT 'how the incident was created: shipper, support-agent, automatic, ...',
    `originId` VARCHAR(255) NOT NULL,
    `entityId` VARCHAR(255) NOT NULL,
    `entityType` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_incidents_entityType` FOREIGN KEY(`entityType`) REFERENCES `incidentEntityTypes`(`name`),
    CONSTRAINT `fk_incidents_type` FOREIGN KEY(`type`) REFERENCES `incidentTypes`(`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE TABLE `attachmentTypes` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO
    `attachmentTypes`(`name`)
VALUES
    ('BUYING_INVOICE');

CREATE TABLE `attachments` (
    `id` CHAR(36) NOT NULL,
    `incidentId` CHAR(36) NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `fileKey` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_attachments_incidentId` FOREIGN KEY(`incidentId`) REFERENCES `incidents`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `fk_attachments_type` FOREIGN KEY(`type`) REFERENCES `attachmentTypes`(`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

-- ==== DOWN ====
DROP TABLE attachments;

DROP TABLE attachmentTypes;

DROP TABLE incidents;

DROP TABLE incidentEntityTypes;

DROP TABLE incidentTypes;
