const { IncidentCreationDeniedError } = require('./abstract');

class StillOnTimeIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return IncidentCreationDeniedError.REASONS.StillOnTime;
  }

  /**
   * @param {Object} param
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ actions } = {}) {
    super({ reason: StillOnTimeIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { StillOnTimeIncidentCreationDeniedError };
