const { BaseIncident } = require('../incident/base');
const { INCIDENT_TYPES } = require('../incident/constants/incident-types');
const {
  AlreadyResolvedIncidentCreationDeniedError
} = require('../incident-creation-denied-error/already-resolved');
const { IncidentCreationRule } = require('./abstract');
const { REASON_DETAILS } = require('./common/details');

class AlreadyResolved extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.AlreadyResolved;
  }

  constructor() {
    super({
      rule: AlreadyResolved.RULE
    });

    // eslint-disable-next-line no-underscore-dangle
    this._onTrue = {
      decision: IncidentCreationRule.DECISIONS.DENY,
      error: new AlreadyResolvedIncidentCreationDeniedError()
    };
  }

  // eslint-disable-next-line class-methods-use-this
  filterClaimsByRequesterType({ similarIncidents, incidentType }) {
    if (!similarIncidents) return similarIncidents;

    switch (incidentType) {
      case INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED:
        return similarIncidents.filter(
          (incident) => incident.type !== INCIDENT_TYPES.PARCEL_LATE_DELIVERY
        );
      case INCIDENT_TYPES.PARCEL_LATE_DELIVERY:
        return similarIncidents.filter(
          (incident) => incident.type === INCIDENT_TYPES.PARCEL_LATE_DELIVERY
        );
      default:
        return similarIncidents.filter((incident) => incident.type === incidentType);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  resolvedIncident(incident) {
    if (incident.status !== BaseIncident.STATUSES.RESOLVED) return false;

    // when it is a refund, we rely on refundStatus
    if (incident.resolutionTypeApplied === BaseIncident.RESOLUTION_TYPES.REFUND) {
      return incident.refundStatus === BaseIncident.REFUND_STATUSES.RESOLVED;
    }

    // when it is a reship, we rely on status
    return true;
  }

  predicateFactory({ similarIncidents, parcel, incidentType, deliveryPromise }) {
    const incidents = this.filterClaimsByRequesterType({ similarIncidents, incidentType }) || [];
    const incident = incidents.find(this.resolvedIncident);

    const reasonDetails = new REASON_DETAILS[incidentType]({
      incident,
      parcel,
      deliveryPromise
    });

    this.details = reasonDetails.get();

    return () => !!incident;
  }

  /**
   * @param {IncidentCreationContext} context
   * @returns {Promise<IncidentCreationDecisionHost | IncidentCreationRule[]>}
   */
  async run(context) {
    const result = await super.run(context);

    return {
      ...result,
      details: this.details
    };
  }
}

module.exports = { AlreadyResolved };
