const { IncidentCreationDeniedError } = require('./abstract');

class TooLateIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return IncidentCreationDeniedError.REASONS.TooLate;
  }

  /**
   * @param {Object} param
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ actions } = {}) {
    super({ reason: TooLateIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { TooLateIncidentCreationDeniedError };
