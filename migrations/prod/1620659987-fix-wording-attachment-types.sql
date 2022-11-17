-- Migration: fix-wording-attachment-types
-- Created at: 2021-05-10 17:15:00
-- ====  UP  ====

INSERT INTO `incidentAttachmentTypes`(`name`) values
  ('ITEM_DAMAGED'),
  ('ITEM_RECEIVED');

UPDATE `incidentAttachments`
    SET `type` = (
        CASE WHEN `type` = 'ITEMS_DAMAGED'
        THEN 'ITEM_DAMAGED'
        ELSE 'ITEM_RECEIVED' END
    )
    WHERE `type` IN ('ITEMS_DAMAGED','ITEMS_RECEIVED');

DELETE FROM `incidentAttachmentTypes`
    WHERE `name` IN ('ITEMS_DAMAGED','ITEMS_RECEIVED');

-- ==== DOWN ====

INSERT INTO `incidentAttachmentTypes`(`name`) values
  ('ITEMS_DAMAGED'),
  ('ITEMS_RECEIVED');

UPDATE `incidentAttachments`
    SET `type` = (
        CASE WHEN `type` = 'ITEM_DAMAGED'
        THEN 'ITEMS_DAMAGED'
        ELSE 'ITEMS_RECEIVED' END
    )
    WHERE `type` IN ('ITEM_DAMAGED','ITEM_RECEIVED');

DELETE FROM `incidentAttachmentTypes`
    WHERE `name` IN ('ITEM_DAMAGED','ITEM_RECEIVED');
