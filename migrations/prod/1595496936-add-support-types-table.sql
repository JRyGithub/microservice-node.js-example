-- ====  UP  ====

CREATE TABLE `entityTypes` (
    `id` VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `supportMappings` (
    `id` CHAR(36) NOT NULL,
    `entityTypeId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `cubynField` VARCHAR(255) NOT NULL,
    `zendeskField` VARCHAR(255) NOT NULL,
    `formatFunction` VARCHAR(255),
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT `fk_entityTypeId_entityTypes` FOREIGN KEY (`entityTypeId`) REFERENCES `entityTypes`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

SET @generalType='SHIPPER_GENERAL_DATA', @wioType='WIO', @orderType='ORDER', @skuType='SKU', @invoiceType='INVOICE';
INSERT INTO entityTypes values (@generalType), (@wioType), (@orderType), (@skuType), (@invoiceType);
INSERT INTO supportMappings (id, entityTypeId, name, cubynField, zendeskField, formatFunction) values
    -- SHIPPER GENERAL DATA FIELDS
    (UUID(), @generalType, 'Shipper ID', 'data.id', 'userpid', null),
    (UUID(), @generalType, 'Enabled', 'data.enabled', 'enabled', null),
    (UUID(), @generalType, 'Sales', 'data.sales', 'sales', null),
    (UUID(), @generalType, 'Presales Category', 'data.preSales', 'presales_category', null),
    (UUID(), @generalType, 'CreatedAt', 'data.createdAt', 'created_at', 'formatISO8601ShortDate'),
    -- WIO FIELDS
    (UUID(), @wioType, 'PID', 'data.pid', '360003634698', null),
    (UUID(), @wioType, 'Created at', 'data.createdAt', '360008236097', 'formatISO8601ShortDate'),
    (UUID(), @wioType, 'Updated at', 'data.updatedAt', '360008236117', 'formatISO8601ShortDate'),
    (UUID(), @wioType, 'Receipt started at', 'data.receiptStartedAt', '360008217338', 'formatISO8601ShortDate'),
    (UUID(), @wioType, 'Completed at', 'data.completedAt', '360008236277', 'formatISO8601ShortDate'),
    (UUID(), @wioType, 'Status', 'data.status', '360008217358', null),
    (UUID(), @wioType, 'Declared packing units', 'data.declaredPackingUnits', '360008236297', null),
    (UUID(), @wioType, 'Received packing units', 'data.receivedPackingUnits', '360008236317', null),
    (UUID(), @wioType, 'Completed packing units', 'data.completedPackingUnits', '360008217378', null),
    (UUID(), @wioType, 'Quantity of items annouced', 'data.declaredItems', '360008236337', null),
    (UUID(), @wioType, 'Quantity of items stored', 'data.storedItems', '360008236357', null),
    (UUID(), @wioType, 'Quantity of items not scannable', 'data.lines', '360008236377', 'getWioNotScannableCount'),
    (UUID(), @wioType, 'Quantity of items labeled', 'data.lines', '360008217398', 'getWioLabelledCount'),
    -- SKU FIELDS
    (UUID(), @skuType, 'quantity per status', 'data', '360008236557', 'stringify'),
    -- ORDER FIELDS
    (UUID(), @orderType, 'PID', 'data.id', '26615929', 'formatOrderPID'),
    (UUID(), @orderType, 'Parcel content', 'data.items', '360008236597', 'stringify'),
    (UUID(), @orderType, 'Order reference', 'data.orderRef', '28355552', null),
    (UUID(), @orderType, 'Current parcel status', 'data.status', '45370545', null),
    (UUID(), @orderType, 'Delivery mode', 'data.deliveryMode', '360002004698', null),
    (UUID(), @orderType, 'Carrier', 'data.carrier', '360001996077', null),
    (UUID(), @orderType, 'Parcel type', 'data.type', '360008217718', null),
    (UUID(), @orderType, 'Carrier tracking id', 'data.carrierTrackingId', '28291032', null),
    (UUID(), @orderType, 'Is delivery signed', 'data.deliverySigned', '45311649', null),
    (UUID(), @orderType, 'Insurance amount', 'data.insurance', '45311609', null),
    (UUID(), @orderType, 'Is advalorem', 'data.isAdvalorem', '360008217758', null),
    (UUID(), @orderType, 'Recipient name', 'data', '28541541', 'getOrderRecipientName'),
    (UUID(), @orderType, 'Application class name', 'data.via.name', '360008236697', null),
    (UUID(), @orderType, 'Parcel weight', 'data.weight', '360005567338', null),
    (UUID(), @orderType, 'Shipped at', 'data.shippedAt', '360005567178', 'formatISO8601ShortDate'),
    (UUID(), @orderType, 'Created at', 'data.createdAt', '360005586757', 'formatISO8601ShortDate'),
    (UUID(), @orderType, 'Validated at', 'data.validatedAt', '360008217678', 'formatISO8601ShortDate'),
    (UUID(), @orderType, 'Picket at', 'data.pickedAt', '360008236577', 'formatISO8601ShortDate'),
    (UUID(), @orderType, 'Updated at', 'data.updatedAt', '360005586777', 'formatISO8601ShortDate'),
    (UUID(), @orderType, 'Original Parcel ID', 'data.originalParcelId', '360008720398', null),
    (UUID(), @orderType, 'Error type', 'data.validations', '360008236717', 'getParcelErrorType'),
    (UUID(), @orderType, 'Sum of articles weight', 'data.totalWeight', '360008236617', null),
    (UUID(), @orderType, 'Destination country', 'data.address.country', '45311669', null),
    (UUID(), @orderType, 'Zip code', 'data.address.zip', '360008217698', null),
    (UUID(), @orderType, 'CN23 Informations', 'data.attachments.CN23', '360008237597', 'stringify'),
    (UUID(), @orderType, 'Label Informations', 'data.attachments.LABEL', '360008217798', 'stringify'),
    (UUID(), @orderType, 'Other Informations', 'data.attachments.OTHER', '360008238157', 'stringify'),
    (UUID(), @orderType, 'Invoice Informations', 'data.attachments.INVOICE', '360008236737', 'stringify'),
    (UUID(), @orderType, 'Delivered at', 'data.deliveredAt', '360008218218', 'formatISO8601ShortDate'),
    (UUID(), @orderType, 'Collect ID', 'data.collectId', '26664229', null),
    -- INVOICE FIELDS
    (UUID(), @invoiceType, 'Invoice link PDF', 'data.pdf.url', '360008236917', null),
    (UUID(), @invoiceType, 'Invoice link XLS', 'data.csv.url', '360008218838', null);

-- ==== DOWN ====

DROP TABLE supportMappings;
DROP TABLE entityTypes;
