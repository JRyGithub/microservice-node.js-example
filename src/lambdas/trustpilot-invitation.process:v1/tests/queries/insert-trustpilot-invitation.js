const TrustpilotInvitationModel = require('../../../../modules/models/trustpilot-invitation');
const {
  // eslint-disable-next-line no-unused-vars
  TrustpilotInvitation
} = require('../../../../modules/trustpilot-invitations/domain/trustpilot-invitation');

/**
 * @param {TrustpilotInvitation} payload
 * @param {import("objection").Transaction | void} trx
 * @returns {TrustpilotInvitation}
 */
async function insertTrustpilotInvitation(payload, trx) {
  const { id } = await TrustpilotInvitationModel.query(trx).insert(payload).execute();
  const tpInvite = await TrustpilotInvitationModel.query(trx).findById(id).execute();

  return tpInvite;
}

module.exports = { insertTrustpilotInvitation };
