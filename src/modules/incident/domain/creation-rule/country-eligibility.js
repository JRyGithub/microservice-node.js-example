const {
  CountryNotEligibleIncidentCreationDeniedError
} = require('../incident-creation-denied-error/country-eligibility');
const { IncidentCreationRule } = require('./abstract');

class CountryNotEligible extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.CountryNotEligible;
  }

  constructor() {
    super({
      rule: CountryNotEligible.RULE
    });

    // eslint-disable-next-line no-underscore-dangle
    this._onTrue = {
      decision: IncidentCreationRule.DECISIONS.DENY,
      error: new CountryNotEligibleIncidentCreationDeniedError()
    };
  }

  // eslint-disable-next-line class-methods-use-this
  predicateFactory({ parcel = {} }) {
    const { address = {} } = parcel;
    const { country } = address;
    const eligibleCountries = ['FR', 'ES'];

    if (!country) return () => true;

    return () => !eligibleCountries.includes(country);
  }
}

module.exports = { CountryNotEligible };
