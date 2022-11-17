const merge = require('lodash/merge');
const {
  TrustpilotInvitation,
  createTrustpilotInvitation
} = require('../../../../modules/trustpilot-invitations/domain/trustpilot-invitation');

/**
 * @type {TrustpilotInvitation}
 */
const BASE_TRUSTPILOT_INVITATION = {
  firstName: `First-${Math.random()}`,
  lastName: `Second-${Math.random()}`,
  email: `${Math.random()}@test.com`,
  entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
  // eslint-disable-next-line no-magic-numbers
  entityId: `${parseInt(Math.random() * 10000, 10)}`
};

/**
 * @param {Partial<TrustpilotInvitation>} overrides
 * @returns {TrustpilotInvitation}
 */
function buildTrustpilotInvitation(overrides) {
  return createTrustpilotInvitation(merge({}, BASE_TRUSTPILOT_INVITATION, overrides));
}

module.exports = { buildTrustpilotInvitation };
