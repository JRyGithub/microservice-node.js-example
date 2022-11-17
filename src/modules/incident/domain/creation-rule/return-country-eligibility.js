const {
  CountryNotEligibleIncidentCreationDeniedError
} = require('../incident-creation-denied-error/country-eligibility');
const { IncidentCreationRule } = require('./abstract');

class ReturnCountryNotEligible extends IncidentCreationRule {
  static get RULE() {
    return IncidentCreationRule.RULES.ReturnCountryNotEligible;
  }

  constructor() {
    super({
      rule: ReturnCountryNotEligible.RULE
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
    const eligibleCountries = [
      'FR',
      'ES',
      'DE',
      'AT',
      'AU',
      'BE',
      'HR',
      'EE',
      'FI',
      'GR',
      'GP',
      'GF',
      'HU',
      'IE',
      'IT',
      'LT',
      'LU',
      'MT',
      'MQ',
      'YT',
      'NL',
      'PL',
      'PT',
      'CZ',
      'RE',
      'RO',
      'GB',
      'PM',
      'SK',
      'SI',
      'CH'
    ];

    if (!country) return () => true;

    return () => !eligibleCountries.includes(country);
  }
}

module.exports = { ReturnCountryNotEligible };
