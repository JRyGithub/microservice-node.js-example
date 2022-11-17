const { PARCEL_STATUS_CARRIER_DELIVERED } = require('../../../../../core/constants/parcels');

/**
 * @param {Parcel} parcel
 * @returns {boolean}
 */
function parcelDeliveredPredicate(parcel) {
  return parcel.status === PARCEL_STATUS_CARRIER_DELIVERED && !!parcel.deliveredAt;
}

module.exports = { parcelDeliveredPredicate };
