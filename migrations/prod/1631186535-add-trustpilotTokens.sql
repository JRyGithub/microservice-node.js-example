-- Migration: add-trustpilotTokens
-- Created at: 2021-09-09 13:22:15

-- ====  UP  ====

CREATE TABLE `trustpilotTokens` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `accessToken` VARCHAR(255),
    `accessTokenIssuedAt` VARCHAR(255),
    `accessTokenExpiresIn` VARCHAR(255),
    `refreshToken` VARCHAR(255),
    `refreshTokenIssuedAt` VARCHAR(255),
    `refreshTokenExpiresIn` VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO `trustpilotTokens`() VALUES();

-- ==== DOWN ====

DROP TABLE `trustpilotTokens`;
