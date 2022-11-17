const { BaseIncident } = require('../incident/base');
const { INCIDENT_TYPES } = require('../incident/constants/incident-types');
const {
  TooLateIncidentCreationDeniedError
} = require('../incident-creation-denied-error/too-late');
const { IncidentCreationRule } = require('./abstract');

// eslint-disable-next-line no-magic-numbers
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

class TooLate extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.TooLate;
  }

  // eslint-disable-next-line no-magic-numbers
  constructor({ days = 5 } = {}) {
    super({
      rule: TooLate.RULE
    });

    // eslint-disable-next-line no-underscore-dangle
    this._onTrue = {
      decision: IncidentCreationRule.DECISIONS.DENY,
      error: new TooLateIncidentCreationDeniedError()
    };
    /**
     * @protected
     * @type {number}
     */
    this.days = days;
  }

  predicateFactory({ parcel = {}, currentDate, similarIncidents, incidentType }) {
    const { deliveredAt = null } = parcel;

    if (incidentType === INCIDENT_TYPES.CONSUMER_RETURN) {
      if (!deliveredAt) return () => false;
      if (
        new Date(currentDate).getTime() <
        new Date(deliveredAt).getTime() + this.days * ONE_DAY_MS
      )
        return () => false;
    }

    const rejectedIncidents = (similarIncidents || [])
      .filter((incident) => incident.status === BaseIncident.STATUSES.REJECTED)
      .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt));

    let relyDate = null;

    if (rejectedIncidents.length > 0) {
      relyDate = rejectedIncidents[rejectedIncidents.length - 1].updatedAt;
    }

    if (incidentType === INCIDENT_TYPES.PARCEL_NEVER_RECEIVED) {
      return () => false;
    }

    relyDate = Math.max(new Date(relyDate).getTime(), new Date(deliveredAt).getTime());
    if (relyDate === 0) {
      return () => true;
    }

    return () => {
      return (
        new Date(relyDate).getTime() + this.days * ONE_DAY_MS <= new Date(currentDate).getTime()
      );
    };
  }
}

module.exports = { TooLate };
