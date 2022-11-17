const {
  DeliveredOnTimeIncidentCreationDeniedError
} = require('../incident-creation-denied-error/delivered-on-time');
const { IncidentCreationRule } = require('./abstract');
const { REASON_DETAILS } = require('./common/details');

class DeliveredOnTime extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.DeliveredOnTime;
  }

  constructor() {
    super({
      rule: DeliveredOnTime.RULE
    });

    // eslint-disable-next-line no-underscore-dangle
    this._onTrue = {
      decision: IncidentCreationRule.DECISIONS.DENY,
      error: new DeliveredOnTimeIncidentCreationDeniedError()
    };
  }

  // eslint-disable-next-line class-methods-use-this
  predicateFactory({ parcel, deliveryPromise, incidentType, currentDate = new Date() }) {
    const reasonDetails = new REASON_DETAILS[incidentType]({
      deliveryPromise,
      parcel
    });
    this.details = reasonDetails.get();

    return () => {
      if (!parcel || !deliveryPromise || !parcel.deliveredAt || !deliveryPromise.before) {
        return false;
      }

      const isDeliveredOnTime =
        new Date(parcel.deliveredAt).getTime() <= new Date(deliveryPromise.before).getTime();
      const wasInPast = new Date(parcel.deliveredAt).getTime() <= new Date(currentDate).getTime();

      return isDeliveredOnTime && wasInPast;
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

module.exports = { DeliveredOnTime };
