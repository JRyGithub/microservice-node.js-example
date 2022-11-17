const {
  DeliveryPromiseCancelled,
  BeingResolved,
  AlreadyResolved,
  Delivered
} = require('../../../creation-rule');
const { INCIDENT_TYPES } = require('../../constants/incident-types');
const { ManualFlowBaseIncident } = require('../../manual-flow-base');

class ParcelMissingProductIncident extends ManualFlowBaseIncident {
  constructor(values) {
    // eslint-disable-next-line no-param-reassign
    values.type = INCIDENT_TYPES.PARCEL_MISSING_PRODUCT;
    super(values);
  }

  static getCreationRules() {
    return [
      new DeliveryPromiseCancelled(),
      new BeingResolved(),
      new AlreadyResolved(),
      new Delivered()
    ];
  }
}

module.exports = { ParcelMissingProductIncident };
