-- Migration: add-all-attachments-types
-- Created at: 2021-04-20 16:32:55
-- ====  UP  ====
INSERT INTO `attachmentTypes`(`name`) values
  ('GENERAL'),
  ('IDENTITY'),
  ('COMMERCIAL_INVOICE'),
  ('COMPLAINT'),
  ('PACKAGE'),
  ('ITEM_PACKAGE'),
  ('ITEMS_DAMAGED'),
  ('ITEMS_RECEIVED'),
  ('INVOICE_PAYMENT_PROOF');
-- ==== DOWN ====
DELETE FROM `incidentTypes`
WHERE `name` in
  ('GENERAL'),
  ('IDENTITY'),
  ('COMMERCIAL_INVOICE'),
  ('COMPLAINT'),
  ('PACKAGE'),
  ('ITEM_PACKAGE'),
  ('ITEMS_DAMAGED'),
  ('ITEMS_RECEIVED'),
  ('INVOICE_PAYMENT_PROOF');
