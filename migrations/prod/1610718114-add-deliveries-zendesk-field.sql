-- Migration: add-deliveries-zendesk-field
-- Created at 2021-01-15 14:41:54
-- ====  UP  ====

INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    (UUID(), 'WIO', 'Deliveries', 'data.deliveries', '360012585057', 'formatDeliveries');

-- ==== DOWN ====

DELETE FROM `supportMappings`
WHERE `name` = 'Deliveries';