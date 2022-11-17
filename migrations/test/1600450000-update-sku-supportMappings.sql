-- ====  UP  ====

BEGIN;

UPDATE supportMappings
SET `cubynField` = 'data.quantityPerStatus'
WHERE `entityTypeId` = 'SKU' AND name = 'quantity per status';

COMMIT;

-- ==== DOWN ====

