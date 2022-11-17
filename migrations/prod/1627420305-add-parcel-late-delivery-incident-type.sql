-- Migration: add-parcel-late-delivery-incident-type
-- Created at: 2021-07-27 23:11:45

-- ====  UP  ====

INSERT INTO `incidentTypes`(`name`)
VALUES
  ('PARCEL_LATE_DELIVERY');

-- ==== DOWN ====

DELETE FROM `incidentTypes`
  WHERE `name` in ('PARCEL_LATE_DELIVERY');
