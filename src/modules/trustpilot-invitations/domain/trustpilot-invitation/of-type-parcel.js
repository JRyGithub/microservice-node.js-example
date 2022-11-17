const { TrustpilotInvitation } = require('./abstract');

class TrustpilotInvitationOfTypeParcel extends TrustpilotInvitation {
  static isOfType(tpInvite) {
    return tpInvite.entityType === this.ENTITY_TYPES.PARCEL;
  }
}

module.exports = { TrustpilotInvitationOfTypeParcel };
