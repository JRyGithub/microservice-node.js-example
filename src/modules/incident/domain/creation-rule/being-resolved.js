const { BaseIncident } = require('../incident/base');
const {
  BeingResolvedIncidentCreationDeniedError
} = require('../incident-creation-denied-error/being-resolved');
const { IncidentCreationRule } = require('./abstract');

const RESOLVED_STATUSES = [BaseIncident.STATUSES.RESOLVED, BaseIncident.STATUSES.REJECTED];
const RESOLVED_REFUND_STATUSES = [
  BaseIncident.REFUND_STATUSES.RESOLVED,
  BaseIncident.REFUND_STATUSES.REJECTED
];

class BeingResolved extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.BeingResolved;
  }

  constructor() {
    super({
      rule: BeingResolved.RULE
    });

    // eslint-disable-next-line no-underscore-dangle
    this._onTrue = {
      decision: IncidentCreationRule.DECISIONS.DENY,
      error: new BeingResolvedIncidentCreationDeniedError()
    };
  }

  // eslint-disable-next-line class-methods-use-this
  beingResolvedIncident(incident, incidentType) {
    if (incident.type !== incidentType) return false;
    if (!RESOLVED_STATUSES.includes(incident.status)) return true;

    // when it is a refund, we rely on refundStatus
    if (incident.resolutionTypeApplied === BaseIncident.RESOLUTION_TYPES.REFUND) {
      return !RESOLVED_REFUND_STATUSES.includes(incident.refundStatus);
    }

    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  predicateFactory({ similarIncidents, incidentType }) {
    if (!similarIncidents) return () => false;

    const beingResolvedIncident = similarIncidents.find((incident) =>
      this.beingResolvedIncident(incident, incidentType)
    );

    return () => !!beingResolvedIncident;
  }
}

module.exports = { BeingResolved };
