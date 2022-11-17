const get = require('lodash/get');

/**
 * Compares objects properties
 *
 * @param {any} first
 * @param {any} second
 * @param {string[]} properties
 * @returns {boolean}
 */
function compareObjectsProperties(first, second, properties) {
  if (!first || !second) {
    return false;
  }

  return properties.every((property) => get(first, property) === get(second, property));
}

module.exports = { compareObjectsProperties };
