const { TooLate, ReturnCountryNotEligible, Delivered } = require('../../../creation-rule');
const { BaseIncident } = require('../../base');
const { INCIDENT_TYPES } = require('../../constants/incident-types');
const { ManualFlowBaseIncident } = require('../../manual-flow-base');

const ALLOWED_STATUSES = [
  BaseIncident.STATUSES.STARTED,
  BaseIncident.STATUSES.RESOLVED,
  BaseIncident.STATUSES.REJECTED
];

class ConsumerReturnIncident extends ManualFlowBaseIncident {
  constructor(values) {
    // eslint-disable-next-line no-param-reassign
    values.type = INCIDENT_TYPES.CONSUMER_RETURN;
    super(values);
  }

  static getCreationRules() {
    return [new ReturnCountryNotEligible(), new TooLate({ days: 60 }), new Delivered()];
  }

  updateStatus(newStatus) {
    // only this status update is supported right now,
    // other statuses should be updated vie resolve/reject flow
    if (!ALLOWED_STATUSES.includes(newStatus)) return;

    this.status = newStatus;
  }
}

module.exports = { ConsumerReturnIncident };
