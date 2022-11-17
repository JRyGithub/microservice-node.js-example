-- Migration: add-requester

--Created at: 2021-09-07 19:16:44


-- ====  UP  ====
CREATE TABLE `incidentRequesters` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(255) NOT NULL,
    `lastName` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `bankInfo` JSON COMMENT 'bank info details of requester',
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

-- ==== DOWN ====
DROP TABLE `incidentRequesters`