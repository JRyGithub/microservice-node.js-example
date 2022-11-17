-- Migration: reject-reason-array
-- Created at: 2021-07-07 23:26:37

-- ====  UP  ====

UPDATE
    `incidents`
SET
    `rejectedReason` = JSON_ARRAY(`rejectedReason`)
WHERE
    `rejectedReason` IS NOT NULL;

-- ==== DOWN ====

UPDATE
    `incidents`
SET
    `rejectedReason` = JSON_EXTRACT(JSON_ARRAY(rejectedReason),"$[0]")
WHERE
    `rejectedReason` IS NOT NULL;

