-- Migration: add-sku-lost-in-warehouse
-- Created at: 2021-04-20 16:32:58

-- ====  UP  ====

INSERT INTO `incidentTypes`(`name`)
VALUES
  ('SKU_LOST_IN_WAREHOUSE');

-- ==== DOWN ====

DELETE FROM `incidentTypes`
  WHERE `name` = 'SKU_LOST_IN_WAREHOUSE';
