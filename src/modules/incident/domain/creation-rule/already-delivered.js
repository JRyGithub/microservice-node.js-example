const {
  AlreadyDeliveredIncidentCreationDeniedError
} = require('../incident-creation-denied-error/already-delivered');
const { parcelDeliveredPredicate } = require('./common/predicates');
const { IncidentCreationRule } = require('./abstract');

class AlreadyDelivered extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.AlreadyDelivered;
  }

  constructor() {
    super({
      rule: AlreadyDelivered.RULE
    });
    // eslint-disable-next-line no-underscore-dangle
    this._onTrue = {
      decision: IncidentCreationRule.DECISIONS.DENY,
      error: new AlreadyDeliveredIncidentCreationDeniedError()
    };
  }

  // eslint-disable-next-line class-methods-use-this
  predicateFactory({ parcel }) {
    return () => parcelDeliveredPredicate(parcel);
  }
}

module.exports = { AlreadyDelivered };
