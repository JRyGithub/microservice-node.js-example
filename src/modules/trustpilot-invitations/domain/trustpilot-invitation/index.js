const { TrustpilotInvitation } = require('./abstract');
const { TrustpilotInvitationOfTypeParcel } = require('./of-type-parcel');
const { UnknownTrustpilotInvitationEntityType } = require('../../errors');

/**
 * @returns {TrustpilotInvitation}
 */
function createTrustpilotInvitation(tpInvite) {
  switch (true) {
    case TrustpilotInvitationOfTypeParcel.isOfType(tpInvite):
      return new TrustpilotInvitationOfTypeParcel(tpInvite);

    default:
      throw new UnknownTrustpilotInvitationEntityType(tpInvite);
  }
}

module.exports = {
  createTrustpilotInvitation,
  TrustpilotInvitation,
  TrustpilotInvitationOfTypeParcel
};
