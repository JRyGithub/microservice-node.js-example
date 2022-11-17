-- Migration: update-reshipParcelId-type-to-integer
-- Created at: 2021-10-05 12:39:56
-- ====  UP  ====
ALTER TABLE
    incidents CHANGE `reshipParcelId` `reshipParcelId` INTEGER DEFAULT NULL;

-- ==== DOWN ====
ALTER TABLE
    incidents CHANGE `reshipParcelId` `reshipParcelId` varchar(255) NULL;