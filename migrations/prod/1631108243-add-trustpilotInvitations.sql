-- Migration: add-trustpilotInvitations
-- Created at: 2021-09-08 15:37:23
-- ====  UP  ====
BEGIN;

CREATE TABLE `trustpilotInvitationStatuses` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE TABLE `trustpilotInvitationReasons` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE TABLE `trustpilotInvitationEntityTypes` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE TABLE `trustpilotInvitations` (
    `id` CHAR(36) NOT NULL,
    `entityType` CHAR(36) NOT NULL,
    `firstName` VARCHAR(255) NOT NULL,
    `lastName` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `entityId` VARCHAR(255) NOT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'TO_DO',
    `reason` VARCHAR(255),
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT `fk_entityType_trustpilotInvitationStatuses` FOREIGN KEY (`status`) REFERENCES `trustpilotInvitationStatuses`(`name`),
    CONSTRAINT `fk_entityType_trustpilotInvitationReasons` FOREIGN KEY (`reason`) REFERENCES `trustpilotInvitationReasons`(`name`),
    CONSTRAINT `fk_entityType_trustpilotInvitationEntityTypes` FOREIGN KEY (`entityType`) REFERENCES `trustpilotInvitationEntityTypes`(`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO `trustpilotInvitationStatuses`(`name`)
VALUES ('TO_DO'),
    ('CANCELLED'),
    ('DONE'),
    ('FAILED');

INSERT INTO `trustpilotInvitationReasons`(`name`)
VALUES ('INCIDENT_FOR_PARCEL_EXISTS'),
    ('ERROR_ON_SEND');

INSERT INTO `trustpilotInvitationEntityTypes`(`name`)
VALUES ('PARCEL'),
    ('INCIDENT');

COMMIT;
-- ==== DOWN ====
BEGIN;

DROP TABLE `trustpilotInvitations`;

DROP TABLE `trustpilotInvitationEntityTypes`;

DROP TABLE `trustpilotInvitationReasons`;

DROP TABLE `trustpilotInvitationStatuses`;

COMMIT;
