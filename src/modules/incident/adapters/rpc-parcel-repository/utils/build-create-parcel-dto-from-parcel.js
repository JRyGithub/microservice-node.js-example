const { shouldParcelEntryBeCloned } = require('./should-parcel-entry-be-cloned');

/**
 * @param {Parcel} parcel
 * @return {Parcel} sanitized parcel
 */
function buildCreateParcelDTOFromParcel(parcel) {
  const parcelEntries = Object.entries(parcel);
  const parcelEntriesToBeCloned = parcelEntries.filter(shouldParcelEntryBeCloned);

  return Object.fromEntries(parcelEntriesToBeCloned);
}

module.exports = { buildCreateParcelDTOFromParcel };
