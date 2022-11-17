const { BaseIncident } = require('../../../incident/base');
const { BaseDetails } = require('./base-details');

class ParcelMissingProductDetails extends BaseDetails {
  constructor({ incident, parcel, deliveryPromise }) {
    super();
    this.incident = incident;
    this.parcel = parcel;
    this.deliveryPromise = deliveryPromise;
  }

  composeProductList() {
    const { concerns = [] } = this.incident;
    const {
      picklist: { lines = [] }
    } = this.parcel || { picklist: {} };
    const products = [];

    for (const concern of concerns) {
      const { productName, reference } =
        lines.find((seekLine) => seekLine.productId === concern.entityId) || {};

      products.push({
        name: productName || reference,
        count: concern.quantity
      });
    }

    return products;
  }

  getRefundDetails() {
    return {
      amount: this.incident.merchandiseValue
    };
  }

  getReshipDetails() {
    const { before: deliveryPromiseDate } = this.deliveryPromise || {};
    const { deliveredAt, address } = this.parcel || {};

    return {
      cubid: this.incident.entityId,
      address: Object.values(address || {}).join(' '),
      deliveryDate: deliveredAt || '',
      deliveryPromise: deliveryPromiseDate || '',
      products: this.composeProductList()
    };
  }

  get() {
    if (!this.incident) return null;

    let details = {};

    if (this.incident.resolutionTypeApplied === BaseIncident.RESOLUTION_TYPES.REFUND) {
      details = this.getRefundDetails();
    } else details = this.getReshipDetails();

    return {
      ...details,
      resolutionTypeApplied: this.incident.resolutionTypeApplied
    };
  }
}

module.exports = { ParcelMissingProductDetails };
