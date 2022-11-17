-- Migration: add-incident-concerns
-- Created at: 2021-04-26 15:07:41
-- ====  UP  ====
ALTER TABLE
    attachmentTypes RENAME TO incidentAttachmentTypes;

ALTER TABLE incidents
    ADD COLUMN `refundId` INT(11) DEFAULT NULL COMMENT 'link to `service.billing`.refunds.id' AFTER `status`;

ALTER TABLE incidentAttachmentValidations
    ADD COLUMN `payload` JSON DEFAULT NULL COMMENT 'from to service_document_validation.documentValidations.outputPayload' AFTER `status`;

-- ==== DOWN ====

ALTER TABLE incidentAttachmentValidations
    DROP COLUMN `payload`;

ALTER TABLE incidents
    DROP COLUMN `refundId`;

ALTER TABLE
    incidentAttachmentTypes RENAME TO attachmentTypes;
