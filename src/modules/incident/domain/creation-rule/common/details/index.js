const { LateDeliveryDetails } = require('./parcel-late-delivery');
const { NeverReceivedDetails } = require('./parcel-never-received');
const { ReceivedDamagedDetails } = require('./parcel-received-damaged');
const { ParcelMissingProductDetails } = require('./parcel-missing-product');
const { ConsumerReturnDetails } = require('./consumer-return');

const REASON_DETAILS = {
  PARCEL_RECEIVED_DAMAGED: ReceivedDamagedDetails,
  PARCEL_NEVER_RECEIVED: NeverReceivedDetails,
  PARCEL_LATE_DELIVERY: LateDeliveryDetails,
  PARCEL_MISSING_PRODUCT: ParcelMissingProductDetails,
  CONSUMER_RETURN: ConsumerReturnDetails
};

module.exports = { REASON_DETAILS };
