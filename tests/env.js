const globalEnv = require('../src/env');

/**
 * @param {Parital<Env>} overrides
 * @returns {Env}
 */
function buildEnv(overrides) {
  return {
    ...globalEnv,
    ...overrides
  };
}

module.exports = { buildEnv };
