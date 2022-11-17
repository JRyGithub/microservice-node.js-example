const { PARCEL_PROPERTIES_TO_CLONE } = require('../constants/parcel-properties-to-clone');

/**
 * Determines should the parcel key be added to clone
 *
 * @param {keyof Parcel} key
 * @returns {boolean}
 */
function shouldParcelKeyBeCloned(key) {
  return PARCEL_PROPERTIES_TO_CLONE.includes(key);
}

module.exports = { shouldParcelKeyBeCloned };
