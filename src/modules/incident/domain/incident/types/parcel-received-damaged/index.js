const { BeingResolved, AlreadyResolved, Delivered } = require('../../../creation-rule');
const { INCIDENT_TYPES } = require('../../constants/incident-types');
const { ManualFlowBaseIncident } = require('../../manual-flow-base');

class ParcelReceivedDamagedIncident extends ManualFlowBaseIncident {
  constructor(values) {
    // eslint-disable-next-line no-param-reassign
    values.type = INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED;
    super(values);
  }

  static getCreationRules() {
    return [new BeingResolved(), new AlreadyResolved(), new Delivered()];
  }
}

module.exports = { ParcelReceivedDamagedIncident };
