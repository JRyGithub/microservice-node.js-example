const { IncidentCreationRule } = require('./abstract');

class DeliveryPromiseCancelled extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.DeliveryPromiseCancelled;
  }

  constructor() {
    super({
      rule: DeliveryPromiseCancelled.RULE
    });

    // eslint-disable-next-line no-underscore-dangle
    this._onTrue = { decision: IncidentCreationRule.DECISIONS.ALLOW };
  }

  // eslint-disable-next-line class-methods-use-this
  predicateFactory(context) {
    return () => context.deliveryPromise && context.deliveryPromise.status === 'CANCELLED';
  }
}

module.exports = { DeliveryPromiseCancelled };
