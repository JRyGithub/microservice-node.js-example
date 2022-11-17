const TrustpilotInvitationModel = require('../../../../modules/models/trustpilot-invitation');
const {
  // eslint-disable-next-line no-unused-vars
  TrustpilotInvitation
} = require('../../../../modules/trustpilot-invitations/domain/trustpilot-invitation');

/**
 * @param {string} id
 * @param {import("objection").Transaction | void} trx
 * @returns {TrustpilotInvitation | void}
 */
async function findTrustpilotInvitationById(id, trx) {
  return TrustpilotInvitationModel.query(trx).findById(id).execute();
}

module.exports = { findTrustpilotInvitationById };
