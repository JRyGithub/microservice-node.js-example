-- Migration: incident-status
-- Created at: 2021-04-13 14:10:13
-- ====  UP  ====
CREATE TABLE `incidentStatuses` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO
    `incidentStatuses`(`name`)
VALUES
    ('CREATED'),
    ('STARTED'),
    ('RESOLVED'),
    ('REJECTED');

CREATE TABLE `incidentRefundStatuses` (
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO
    `incidentRefundStatuses`(`name`)
VALUES
    ('CREATED'),
    ('STARTED'),
    ('RESOLVED'),
    ('REJECTED');

ALTER TABLE
    `incidents`
ADD
    COLUMN `status` VARCHAR(255) NOT NULL DEFAULT 'CREATED'
AFTER
    `type`,
ADD
    COLUMN `refundStatus` VARCHAR(255) NOT NULL DEFAULT 'CREATED'
AFTER
    `type`,
ADD
    CONSTRAINT `fk_incidents_status` FOREIGN KEY(`status`) REFERENCES `incidentStatuses`(`name`),
ADD
    CONSTRAINT `fk_incidents_refundStatus` FOREIGN KEY(`refundStatus`) REFERENCES `incidentRefundStatuses`(`name`);

-- ==== DOWN ====
ALTER TABLE
    `incidents` DROP FOREIGN KEY `fk_incidents_refundStatus`;

ALTER TABLE
    `incidents` DROP FOREIGN KEY `fk_incidents_status`;

ALTER TABLE
    `incidents` DROP COLUMN `status`;

ALTER TABLE
    `incidents` DROP COLUMN `refundStatus`;

DROP TABLE `incidentStatuses`;

DROP TABLE `incidentRefundStatuses`;
