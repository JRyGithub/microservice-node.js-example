-- Migration: update-order-validatedAt-field
-- Created at: 2017-02-13 15:18:01
-- ====  UP  ====

BEGIN;

UPDATE supportMappings
SET `cubynField` = 'data.picklist.validatedAt'
WHERE `entityTypeId` = 'ORDER' AND name = 'Validated at';

COMMIT;

-- ==== DOWN ====

