-- Migration: update-invoice-id
-- ====  UP  ====

BEGIN;

UPDATE supportMappings
SET `cubynField` = 'data.realId'
WHERE `entityTypeId` = 'INVOICE' AND name = 'Id';

COMMIT;

-- ==== DOWN ====

