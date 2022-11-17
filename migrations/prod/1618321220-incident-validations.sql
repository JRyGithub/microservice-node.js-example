-- Migration: incident-validations
-- Created at: 2021-04-13 15:40:20
-- ====  UP  ====
CREATE TABLE `incidentAttachmentValidationTypes` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO
    `incidentAttachmentValidationTypes`(`name`)
VALUES
    ('BUYING_INVOICE');

CREATE TABLE `incidentAttachmentValidationStatuses` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO
    `incidentAttachmentValidationStatuses`(`name`)
VALUES
    ('CREATED'),
    ('STARTED'),
    ('VALIDATED'),
    ('REJECTED');

CREATE TABLE `incidentAttachmentValidations` (
    `id` CHAR(36) NOT NULL,
    `incidentId` CHAR(36) NOT NULL,
    `validationId` CHAR(36) NOT NULL COMMENT 'link to service_document_validation.documentValidations.id',
    `type` VARCHAR(255) NOT NULL,
    `status` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_incidentAttachmentValidations_incidentId` FOREIGN KEY(`incidentId`) REFERENCES `incidents`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `fk_incidentAttachmentValidations_type` FOREIGN KEY(`type`) REFERENCES `incidentAttachmentValidationTypes`(`name`),
    CONSTRAINT `fk_incidentAttachmentValidations_status` FOREIGN KEY(`status`) REFERENCES `incidentAttachmentValidationStatuses`(`name`),
    CONSTRAINT `idx_incidentAttachmentValidations_validationId` UNIQUE (`validationId`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

-- ==== DOWN ====
DROP TABLE `incidentAttachmentValidations`;

DROP TABLE `incidentAttachmentValidationStatuses`;

DROP TABLE `incidentAttachmentValidationTypes`;
