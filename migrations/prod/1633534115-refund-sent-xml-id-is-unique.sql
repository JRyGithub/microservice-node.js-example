-- Migration: refund-sent-xml-id-is-unique

-- Created at: 2021-10-06 18:28:35

-- ====  UP  ====
ALTER TABLE `incidents` ADD UNIQUE (refundSentXMLEndToEndId);

-- ==== DOWN ====

ALTER TABLE `incidents` DROP INDEX refundSentXMLEndToEndId;
