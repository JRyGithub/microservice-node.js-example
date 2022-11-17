const merge = require('lodash/merge');
/**
 * @type {Parcel}
 */
const BASE_TRUSTPILOT_INVITATION = {
  firstName: `First-${Math.random()}`,
  lastName: `Last-${Math.random()}`,
  email: `${Math.random()}@test.com`
};

/**
 * @param {Partial<Parcel>} overrides
 * @returns {Parcel}
 */
function buildParcel(overrides) {
  return merge({}, BASE_TRUSTPILOT_INVITATION, overrides);
}

module.exports = { buildParcel };
