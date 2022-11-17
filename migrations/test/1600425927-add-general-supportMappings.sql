-- ====  UP  ====

INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    (UUID(), 'GENERAL_DATA', 'Ticket type', 'data.ticketType', '360009231597', null),
    (UUID(), 'GENERAL_DATA', 'Created by', 'data.ticketCreatedBy', '360010216838', null),
    (UUID(), 'GENERAL_DATA', 'Reason', 'data.ticketReason', '360010269217', null);

-- ==== DOWN ====

DELETE FROM `supportMappings`
WHERE `entityTypeId` = 'GENERAL_DATA'
