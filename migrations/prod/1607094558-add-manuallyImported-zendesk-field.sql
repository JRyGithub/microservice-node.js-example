-- Migration: add-manuallyImported-zendesk-field
-- Created at: 2020-12-04 16:09:18

-- ====  UP  ====

INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    (UUID(), 'ORDER', 'IsManual Import', 'data.via', '360011440437', 'isManuallyImported');

-- ==== DOWN ====

DELETE FROM `supportMappings`
WHERE `name` = 'IsManual Import';