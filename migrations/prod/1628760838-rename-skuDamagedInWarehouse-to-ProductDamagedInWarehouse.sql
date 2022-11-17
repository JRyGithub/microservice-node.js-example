-- Migration: rename-skuDamagedInWarehouse-to-ProductDamagedInWarehouse
-- Created at: 2021-08-12 11:33:58

-- ====  UP  ====

BEGIN;

INSERT INTO incidentTypes (name) VALUES
    ('PRODUCT_DAMAGED_IN_WAREHOUSE');

UPDATE incidents
    SET `type` = 'PRODUCT_DAMAGED_IN_WAREHOUSE'
    WHERE `type` = 'SKU_DAMAGED_IN_WAREHOUSE';

DELETE FROM incidentTypes
    WHERE `name` = 'SKU_DAMAGED_IN_WAREHOUSE';

COMMIT;

-- ==== DOWN ====

BEGIN;

INSERT INTO incidentTypes (name) VALUES
    ('SKU_DAMAGED_IN_WAREHOUSE');

UPDATE incidents
    SET `type` = 'SKU_DAMAGED_IN_WAREHOUSE'
    WHERE `type` = 'PRODUCT_DAMAGED_IN_WAREHOUSE';

DELETE FROM incidentTypes
    WHERE `name` = 'PRODUCT_DAMAGED_IN_WAREHOUSE';

COMMIT;
