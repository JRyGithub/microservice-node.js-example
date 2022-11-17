-- Migration: add-trustpilotInvitationReasons
-- Created at: 2021-10-19 13:40:35
-- ====  UP  ====
INSERT INTO `trustpilotInvitationReasons`(`name`)
VALUES ('PARCEL_DESTINATION_IS_NOT_TRUSTED');
-- ==== DOWN ====
DELETE FROM `trustpilotInvitationReasons`
WHERE `name` in (
        'PARCEL_DESTINATION_IS_NOT_TRUSTED'
    );
