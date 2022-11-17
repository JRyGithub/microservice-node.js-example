const {
  StillOnTimeIncidentCreationDeniedError
} = require('../incident-creation-denied-error/still-on-time');
const { IncidentCreationRule } = require('./abstract');
const { REASON_DETAILS } = require('./common/details');

class StillOnTime extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.StillOnTime;
  }

  constructor() {
    super({
      rule: StillOnTime.RULE
    });

    // eslint-disable-next-line no-underscore-dangle
    this._onTrue = {
      decision: IncidentCreationRule.DECISIONS.DENY,
      error: new StillOnTimeIncidentCreationDeniedError()
    };
  }

  // eslint-disable-next-line class-methods-use-this
  predicateFactory({ parcel, deliveryPromise, incidentType, currentDate }) {
    const reasonDetails = new REASON_DETAILS[incidentType]({
      parcel,
      deliveryPromise
    });
    this.details = reasonDetails.get();

    const { deliveredAt } = parcel;

    return () => {
      if (!deliveryPromise || !deliveryPromise.before) {
        return false;
      }

      const notDeliveredYet = !deliveredAt;
      const isOnTime = new Date(currentDate).getTime() < new Date(deliveryPromise.before).getTime();

      return notDeliveredYet && isOnTime;
    };
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

module.exports = { StillOnTime };
