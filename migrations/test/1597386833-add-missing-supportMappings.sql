-- ====  UP  ====

INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    -- SKU FIELDS
    (UUID(), 'SKU', 'Id', 'data.id', '360009320917', null),
    -- INVOICE FIELDS
    (UUID(), 'INVOICE', 'Id', 'data.id', '360009319878', null);

-- ==== DOWN ====

DELETE FROM `supportMappings`
WHERE `entityTypeId` = 'SKU'
AND `name` = 'Id';

DELETE FROM `supportMappings`
WHERE `entityTypeId` = 'INVOICE'
AND `name` = 'Id';
