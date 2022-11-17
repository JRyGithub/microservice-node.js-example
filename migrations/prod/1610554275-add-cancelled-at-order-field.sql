-- Migration: add-manuallyImported-zendesk-field
-- Created at: 2020-12-04 16:09:18

-- ====  UP  ====

INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    (UUID(), 'ORDER', 'Cancelled At', 'data.cancelledAt', '360012523558', 'formatISO8601ShortDate');

-- ==== DOWN ====

DELETE FROM `supportMappings`
WHERE `name` = 'Cancelled At';