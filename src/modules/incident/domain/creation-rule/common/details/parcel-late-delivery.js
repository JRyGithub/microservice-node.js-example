const { BaseDetails } = require('./base-details');

class LateDeliveryDetails extends BaseDetails {
  constructor({ incident, parcel, deliveryPromise }) {
    super();
    this.incident = incident || {};
    this.deliveryPromise = deliveryPromise || {};
    this.parcel = parcel || {};
  }

  get() {
    const { before } = this.deliveryPromise;
    const { merchandiseValue, decidedToRefundAt } = this.incident;
    const { deliveredAt } = this.parcel;

    return {
      merchandiseValue: (merchandiseValue || '').toString(),
      deliveryPromise: before || '',
      decidedToRefundAt: decidedToRefundAt || '',
      deliveryDate: deliveredAt || ''
    };
  }
}

module.exports = { LateDeliveryDetails };
