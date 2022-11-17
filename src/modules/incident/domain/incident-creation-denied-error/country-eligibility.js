const { IncidentCreationDeniedError } = require('./abstract');

class CountryNotEligibleIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return IncidentCreationDeniedError.REASONS.CountryNotEligible;
  }

  /**
   * @param {Object} param
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ actions } = {}) {
    super({ reason: CountryNotEligibleIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { CountryNotEligibleIncidentCreationDeniedError };
