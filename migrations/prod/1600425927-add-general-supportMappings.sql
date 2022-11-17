-- ====  UP  ====

INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    (UUID(), 'GENERAL_DATA', 'Ticket type', 'data.ticketType', '360009321037', null),
    (UUID(), 'GENERAL_DATA', 'Created by', 'data.ticketCreatedBy', '25790859', null),
    (UUID(), 'GENERAL_DATA', 'Reason', 'data.ticketReason', '360010220698', null);

-- ==== DOWN ====

DELETE FROM `supportMappings`
WHERE `entityTypeId` = 'GENERAL_DATA'
