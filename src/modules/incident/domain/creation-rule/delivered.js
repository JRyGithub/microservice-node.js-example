const {
  NotDeliveredIncidentCreationDeniedError
} = require('../incident-creation-denied-error/not-delivered');
const { parcelDeliveredPredicate } = require('./common/predicates');
const { IncidentCreationRule } = require('./abstract');
const { REASON_DETAILS } = require('./common/details');

class Delivered extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.Delivered;
  }

  constructor() {
    super({
      rule: Delivered.RULE
    });

    // eslint-disable-next-line no-underscore-dangle
    this._onFalse = {
      decision: IncidentCreationRule.DECISIONS.DENY,
      error: new NotDeliveredIncidentCreationDeniedError()
    };
  }

  // eslint-disable-next-line class-methods-use-this
  predicateFactory({ parcel, deliveryPromise, incidentType }) {
    const reasonDetails = new REASON_DETAILS[incidentType]({
      parcel,
      deliveryPromise
    });
    this.details = reasonDetails.get();

    return () => parcelDeliveredPredicate(parcel);
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

module.exports = { Delivered };
