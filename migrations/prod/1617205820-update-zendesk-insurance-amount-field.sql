-- Migration: update-zendesk-insurance-amount-field
-- Created at: 2021-03-31 17:50:20

-- ====  UP  ====

UPDATE supportMappings
SET `zendeskField` = '360016610078'
WHERE `name` = 'Insurance amount';

-- ==== DOWN ====

UPDATE supportMappings
SET `zendeskField` = '45311609'
WHERE `name` = 'Insurance amount';
