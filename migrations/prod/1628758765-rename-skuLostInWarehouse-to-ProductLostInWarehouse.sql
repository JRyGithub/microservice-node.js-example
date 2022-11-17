-- Migration: rename-skuLostInWarehouse-to-ProductLostInWarehouse
-- Created at: 2021-08-12 10:59:25

-- ====  UP  ====

BEGIN;

INSERT INTO incidentTypes (name) VALUES
    ('PRODUCT_LOST_IN_WAREHOUSE');

UPDATE incidents
    SET `type` = 'PRODUCT_LOST_IN_WAREHOUSE'
    WHERE `type` = 'SKU_LOST_IN_WAREHOUSE';

DELETE FROM incidentTypes
    WHERE `name` = 'SKU_LOST_IN_WAREHOUSE';

COMMIT;

-- ==== DOWN ====

BEGIN;

INSERT INTO incidentTypes (name) VALUES
    ('SKU_LOST_IN_WAREHOUSE');

UPDATE incidents
    SET `type` = 'SKU_LOST_IN_WAREHOUSE'
    WHERE `type` = 'PRODUCT_LOST_IN_WAREHOUSE';

DELETE FROM incidentTypes
    WHERE `name` = 'PRODUCT_LOST_IN_WAREHOUSE';

COMMIT;
