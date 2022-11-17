-- Migration: add-consumer-return-type
-- Created at: 2022-01-06 09:56:49
-- ====  UP  ====

INSERT INTO `incidentTypes`(`name`)
VALUES
  ('CONSUMER_RETURN');

-- ==== DOWN ====

DELETE FROM `incidentTypes`
  WHERE `name` in ('CONSUMER_RETURN');
