-- Migration: reject-reason-transform
-- Created at: 2021-06-16 15:32:01

-- ====  UP  ====

BEGIN;
	ALTER TABLE
		`incidents`
	MODIFY
		`rejectedReason` VARCHAR(300);

	UPDATE
		`incidents`
	SET
		`rejectedReason` = JSON_OBJECT("msg",`rejectedReason`)
	WHERE
		`rejectedReason` IS NOT NULL;

	ALTER TABLE
		`incidents`
	MODIFY
		`rejectedReason` JSON;
COMMIT;

-- ==== DOWN ====

BEGIN;
	ALTER TABLE 
		`incidents`
	MODIFY
		`rejectedReason` VARCHAR(300);

	UPDATE
		`incidents`
	SET
		`rejectedReason` = JSON_UNQUOTE(`rejectedReason`->'$.msg')
	WHERE
		`rejectedReason` IS NOT NULL;

	ALTER TABLE
		`incidents`
	MODIFY
		`rejectedReason` VARCHAR(255);
COMMIT;
