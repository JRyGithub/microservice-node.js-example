const TrustpilotInvitationModel = require('../../../../modules/models/trustpilot-invitation');

async function findSpecificIncident({ parcelId }) {
  return TrustpilotInvitationModel.query()
    .where({
      entityType: TrustpilotInvitationModel.ENTITY_TYPES.PARCEL,
      entityId: parcelId
    })
    .first()
    .execute();
}

module.exports = { findSpecificIncident };
