const { BaseDetails } = require('./base-details');

class ConsumerReturnDetails extends BaseDetails {
  constructor({ incident, parcel, deliveryPromise }) {
    super();
    this.incident = incident || {};
    this.deliveryPromise = deliveryPromise || {};
    this.parcel = parcel || {};
  }

  get() {
    const { before } = this.deliveryPromise;
    const { deliveredAt } = this.parcel;

    return {
      deliveryPromise: before || '',
      deliveryDate: deliveredAt || ''
    };
  }
}

module.exports = { ConsumerReturnDetails };
