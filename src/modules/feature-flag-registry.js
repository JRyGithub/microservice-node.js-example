/* eslint-disable no-unused-vars */

/**
 * Build an array of shipper ids from a string
 * @param {string} stringIds shipper ids in one string
 * @returns {array} list of shipper ids
 */
function parseShipperIds(stringIds) {
  return stringIds
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value && !Number.isNaN(value))
    .map((value) => Number(value));
}

function isShipperActivated(featureShipperIds, shipperId) {
  if (featureShipperIds === '*') {
    return true;
  }

  return featureShipperIds.includes(shipperId);
}

/* eslint-enable no-unused-vars */

/**
 * Get shipper ids list from env variablie
 * "" => all shippers deactivated
 * "*" => all shippers activated
 * "123,456,789" => comma separated list of shipper ids
 */

// Example:
// const exampleStringIds = env.FEATURE_FLAG_EXAMPLE_SHIPPER_IDS || '';
// const exampleShipperIds = parseShipperIds(exampleStringIds);
// function isShipperActivatedExample(shipperId) {
//     return isShipperActivated(exampleShipperIds, shipperId);
// }

module.exports = {};
