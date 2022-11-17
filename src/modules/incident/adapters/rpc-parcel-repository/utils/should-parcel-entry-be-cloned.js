const { shouldParcelKeyBeCloned } = require('./should-parcel-key-be-cloned');

/**
 * Determines should the parcel entry be added to clone
 *
 * @param {[keyof Parcel, Parcel[keyof Parcel]]} param0
 * @returns {boolean}
 */
function shouldParcelEntryBeCloned([key]) {
  return shouldParcelKeyBeCloned(key);
}

module.exports = { shouldParcelEntryBeCloned };
