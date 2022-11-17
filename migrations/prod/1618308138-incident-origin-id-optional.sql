-- Migration: incident-origin-id-optional
-- Created at: 2021-04-13 12:02:18
-- ====  UP  ====
ALTER TABLE
    incidents CHANGE `originId` `originId` varchar(255) NULL;

-- ==== DOWN ====
ALTER TABLE
    incidents CHANGE `originId` `originId` VARCHAR(255) NOT NULL;
