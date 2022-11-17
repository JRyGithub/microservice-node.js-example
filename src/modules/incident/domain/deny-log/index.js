const { v4: uuid } = require('uuid');

/**
 * Factory to create specific domain requester
 *
 * @param {Object} values
 * @returns {Object}
 */
function createDenyLog(values) {
  return {
    id: uuid(),
    ...values
  };
}

module.exports = { createDenyLog };
