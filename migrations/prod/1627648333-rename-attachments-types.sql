-- Migration: rename-attachments-types
-- Created at: 2021-06-01 12:30:55

-- ====  UP  ====
BEGIN;

-- on incidentAttachmentValidationTypes
INSERT INTO `incidentAttachmentValidationTypes`(`name`)
  VALUES  ('AFFIDAVIT'),
    ('COMMERCIAL_INVOICE'),
    ('GENERAL'),
    ('IDENTIFICATION_DOCUMENT'),
    ('POLICE_REPORT');

-- on incidentAttachmentTypes
INSERT INTO `incidentAttachmentTypes`(`name`)
  VALUES ('AFFIDAVIT'),
    ('IDENTIFICATION_DOCUMENT'),
    ('POLICE_REPORT');

UPDATE `incidentAttachments`
  SET `type` = 'IDENTIFICATION_DOCUMENT'
  WHERE `type` = 'IDENTITY';

DELETE FROM `incidentAttachmentTypes`
  WHERE `name` in(
      'IDENTITY',
      'ITEM_PACKAGE',
      'ITEMS_RECEIVED',
      'INVOICE_PAYMENT_PROOF',
      'PACKAGE'
  );

COMMIT;

-- ==== DOWN ====
BEGIN;

-- on incidentAttachmentValidationTypes
DELETE FROM `incidentAttachmentValidationTypes`
  WHERE `name` in(
      'AFFIDAVIT',
      'COMMERCIAL_INVOICE',
      'GENERAL',
      'IDENTIFICATION_DOCUMENT',
      'POLICE_REPORT'
  );

-- on incidentAttachmentTypes
INSERT INTO `incidentAttachmentTypes`(`name`)
  VALUES ('IDENTITY'),
    ('ITEM_PACKAGE'),
    ('ITEMS_RECEIVED'),
    ('INVOICE_PAYMENT_PROOF'),
    ('PACKAGE');

UPDATE `incidentAttachments`
  SET `type` = 'IDENTITY'
  WHERE `type` = 'IDENTIFICATION_DOCUMENT';

DELETE FROM `incidentAttachmentTypes`
  WHERE `name` in(
      'IDENTIFICATION_DOCUMENT',
      'POLICE_REPORT',
      'AFFIDAVIT'
  );

COMMIT;
