-- ====  UP  ====

INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    (UUID(), 'ORDER', 'Last event message', 'data.lastEventMessage', '360010316837', null);

-- ==== DOWN ====

DELETE FROM `supportMappings`
WHERE `entityTypeId` = 'ORDER'
AND `name` = 'Last event message';
