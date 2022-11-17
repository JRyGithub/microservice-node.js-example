const TrustpilotInvitationModel = require('../../../../modules/models/trustpilot-invitation');
const {
  // eslint-disable-next-line no-unused-vars
  TrustpilotInvitation
} = require('../../../../modules/trustpilot-invitations/domain/trustpilot-invitation');

/**
 * @param {TrustpilotInvitation[]} tis
 * @param {import("objection").Transaction | void} trx
 * @returns {void}
 */
async function deleteTrustpilotInvitations(tis, trx) {
  await TrustpilotInvitationModel.query(trx)
    .delete()
    .findByIds(tis.map(({ id }) => id))
    .execute();
}

module.exports = { deleteTrustpilotInvitations };
