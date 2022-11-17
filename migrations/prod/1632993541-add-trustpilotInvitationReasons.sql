-- Migration: add-trustpilotInvitationReasons
-- Created at: 2021-09-30 11:19:01
-- ====  UP  ====

INSERT INTO `trustpilotInvitationReasons`(`name`)
VALUES ('SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK'),
    ('ERROR_COMPOSING_CANCEL_COMPUTATION_CONTEXT');

-- ==== DOWN ====

DELETE FROM `trustpilotInvitationReasons`
WHERE `name` in (
        'SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK',
        'ERROR_COMPOSING_CANCEL_COMPUTATION_CONTEXT'
    );
