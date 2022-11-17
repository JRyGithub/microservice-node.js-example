-- Migration: add-return-addresses-general-data
-- Created at: 2020-12-01 17:45:40

-- ====  UP  ====

INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    (UUID(), 'GENERAL_DATA', 'Carrier return address', 'data.carrierReturnAddress', '360011303417', 'formatAddress'),
    (UUID(), 'GENERAL_DATA', 'Recipient return address', 'data.recipientReturnAddress', '360011277878', 'formatAddress'),
    (UUID(), 'GENERAL_DATA', 'Shipper return address', 'data.shipperReturnAddress', '360011303437', 'formatAddress');

-- ==== DOWN ====

DELETE FROM `supportMappings`
WHERE `entityTypeId` = 'GENERAL_DATA' AND 
(`name` = 'Carrier return address' OR 
`name` = 'Recipient return address' OR 
`name` = 'Shipper return address')
