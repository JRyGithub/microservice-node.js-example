const { BeingResolved, AlreadyResolved } = require('../../../creation-rule');
const { INCIDENT_TYPES } = require('../../constants/incident-types');
const { ManualFlowBaseIncident } = require('../../manual-flow-base');

class ParcelNeverReceivedIncident extends ManualFlowBaseIncident {
  constructor(values) {
    // eslint-disable-next-line no-param-reassign
    values.type = INCIDENT_TYPES.PARCEL_NEVER_RECEIVED;
    super(values);
  }

  static getCreationRules() {
    return [new BeingResolved(), new AlreadyResolved()];
  }
}

module.exports = { ParcelNeverReceivedIncident };
